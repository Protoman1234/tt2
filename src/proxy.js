const request = require('request')
const pick = require('lodash').pick
const shouldCompress = require('./shouldCompress')
const redirect = require('./redirect')
const compress = require('./compress')
const reEncode = require('./reEncode')
const bypass = require('./bypass')
const copyHeaders = require('./copyHeaders')

function proxy(req, res) {
  request.get(
    req.params.url,
    {
      headers: {
        ...pick(req.headers, ['cookie', 'dnt', 'referer']),
        'user-agent': 'Bandwidth-Hero Compressor',
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
        via: '1.1 bandwidth-hero'
      },
      timeout: 10000,
      maxRedirects: 5,
      encoding: null,
      strictSSL: false,
      gzip: true,
      jar: true
    },
    (err, origin, buffer) => {
      if (err || origin.statusCode >= 400) return redirect(req, res)

      copyHeaders(origin, res)
      res.setHeader('content-encoding', 'identity')
      let originType = origin.headers['content-type'] || ''
      req.params.originType = originType
      req.params.originSize = buffer.length

      if (shouldCompress(req, buffer)) {
        compress(req, res, buffer)
      } else if (originType.startsWith('video') || originType.startsWith('audio')){
        reEncode(req, res, buffer)
      }else {
        bypass(req, res, buffer)
      }
    }
  )
}

module.exports = proxy
