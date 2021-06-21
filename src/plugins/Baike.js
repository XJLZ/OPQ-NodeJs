const https = require('https')
const Iconv = require('iconv-lite');
const cheerio = require('cheerio')
const request = require('request')
const qs = require('querystring')
const Api = require('../SendMsg')
let Baike = {
	doAction(groupId, content) {
		let keyWord = content.substring(2).trim()
		keyWord = qs.escape(keyWord)
		// 获取重定向后的url
		var find_link = function (link, collback) {
			var f = function (link) {
				var options = {
					url: link,
					followRedirect: false,
					method: 'GET'
				}

				request(options, (error, response, body) => {
					console.log(response.statusCode)
					if (response.statusCode == 301 || response.statusCode == 302) {
						var location = response.headers.location;
						console.log('location: ' + location)
						f("https://baike.baidu.com" + location)
					} else {
						collback(link)
					}
				})
			}

			f(link)
		}
		find_link("https://baike.baidu.com/item/" + keyWord, function (link) {
			https.get(link, (res) => {
				const { statusCode } = res
				const contentType = res.headers['content-type']
				let error;
				if (statusCode !== 200) {
					error = new Error('请求失败\n' + `状态码: ${statusCode}`)
					Api.SendTextMsgV2(groupId, error.message)
				}
				if (error) {
					console.error(error.message)
					// 消费响应数据来释放内存。
					res.resume()
					return
				}
				let html = ''
				// 数据分段 只要接收数据就会触发data事件  chunk：每次接收的数据片段
				res.on('data', (chunk) => {
					html += Iconv.decode(chunk, 'utf-8').toString()
				})
				// 数据流传输完毕
				res.on('end', () => {
					console.log('数据传输完毕！')
					try {
						let $ = cheerio.load(html)
						let content = ''
						$('div.lemma-summary > div.para').each((index, el) => {
							content += $(el).text()
						})
						Iconv.decode(content, 'utf-8').toString()
						content = content.replace(/\[.*\]/g, '').replace(/[\r\n]/g, '')
						Api.SendTextMsgV2(groupId, content)
					} catch (e) {
						console.error(e.message);
					}
				})
			}).on('error', (e) => {
				console.error(`出现错误: ${e.message}`);
			})
		})
	}
}
module.exports = Baike