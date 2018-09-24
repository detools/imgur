const request = require('request')
const fs = require('fs')
const urlParser = require('url')
const glob = require('glob')

// The following client ID is tied to the
// registered 'node-imgur' app and is available
// here for public, anonymous usage via this node
// module only.
let {
  IMGUR_MASHAPE_KEY,
  IMGUR_API_URL = 'https://api.imgur.com/3/',
  IMGUR_CLIENT_ID = 'f0ea04148a54268',
  IMGUR_USERNAME,
  IMGUR_PASSWORD,
  IMGUR_ACCESS_TOKEN,
} = process.env

const imgur = {}

// An IIFE that returns the OS-specific home directory
// as a location to optionally store the imgur client id
const HOME_PATH = process.platform === 'win32' ? 'USERPROFILE' : 'HOME'
const DEFAULT_CLIENT_ID_PATH = `${process.env[HOME_PATH]}/.imgur`

imgur.VERSION = require('../package.json').version

/**
* Send a request to imgur's public API
*
* @param   {string}  operation - operation to perform 'info' or 'upload'
* @param   {mixed}   payload - image data
* @returns {promise}
*/
imgur.imgurRequest = (operation, payload, extraFormParams) => new Promise((resolve, reject) => {
  let form = null
  const options = {
    uri: IMGUR_API_URL,
    method: null,
    encoding: 'utf8',
    json: true,
  }

  if (!operation) {
    reject('You should define an operation')
  }

  if (typeof operation !== 'string') {
    reject('Operation is not a string')
  }

  if ((!payload && operation !== ('credits' && 'search'))) {
    reject('On empty payload only "credits" and "search" are accepted')
  }

  switch (operation) {
    case 'upload':
      options.method = 'POST'
      options.uri += 'image'
      break
    case 'credits':
      options.method = 'GET'
      options.uri += 'credits'
      break
    case 'info':
      options.method = 'GET'
      options.uri += `image/${payload}`
      break
    case 'album':
      options.method = 'GET'
      options.uri += `album/${payload}`
      break
    case 'createAlbum':
      options.method = 'POST'
      options.uri += 'album'
      break
    case 'delete':
      options.method = 'DELETE'
      options.uri += `image/${payload}`
      break
    case 'search':
      options.method = 'GET'
      options.uri += `/gallery/search/${payload}`
      break
    default:
      reject('Invalid operation')
  }

  // eslint-disable-next-line
  imgur._getAuthorizationHeader()
    .then((authorizationHeader) => {
      if (IMGUR_MASHAPE_KEY) {
        options.headers = {
          'Authorization': authorizationHeader,
          'X-Mashape-Key': IMGUR_MASHAPE_KEY,
        }
      } else {
        options.headers = {
          Authorization: authorizationHeader,
        }
      }

      const r = request(options, (err, res, body) => {
        if (err) {
          reject(err)
        } else if (body && !body.success) {
          reject({
            status: body.status,
            message: body.data ? body.data.error : 'No body data response',
          })
        } else {
          resolve(body)
        }
      })

      if (operation === 'upload') {
        form = r.form()
        form.append('image', payload)

        if (typeof extraFormParams === 'object') {
          for (const param of Object.keys(extraFormParams)) {
            form.append(param, extraFormParams[param])
          }
        }
      }
    })
    .catch(reject)
})

/**
* Make a request, handling potential errors
*
* @param {object} options
* @returns {promise}
*/
// eslint-disable-next-line
imgur._request = (options) => new Promise((resolve, reject) => {
  request(options, (err, res) => err ? reject(err) : resolve(res))
})

/**
* Get imgur access token using credentials
*
* @returns {promise}
*/
// eslint-disable-next-line
imgur._getAuthorizationHeader = () => new Promise((resolve, reject) => {
  if (IMGUR_ACCESS_TOKEN) {
    resolve(`Bearer ${IMGUR_ACCESS_TOKEN}`)
  } else if (IMGUR_USERNAME && IMGUR_PASSWORD) {
    const options = {
      uri: 'https://api.imgur.com/oauth2/authorize',
      method: 'GET',
      encoding: 'utf8',
      qs: {
        client_id: IMGUR_CLIENT_ID,
        response_type: 'token',
      },
    }

    // eslint-disable-next-line
    imgur._request(options).then((res) => {
      const authorizeToken = res
        .headers['set-cookie'][0]
        // eslint-disable-next-line
        .match('(^|)[\s]*authorize_token=([^]*)')[2]

      options.method = 'POST'
      options.json = true
      options.form = {
        username: IMGUR_USERNAME,
        password: IMGUR_PASSWORD,
        allow: authorizeToken,
      }
      options.headers = {
        Cookie: `authorize_token=${authorizeToken}`,
      }

      // eslint-disable-next-line
      imgur._request(options).then((response) => {
        const { location } = response.headers
        const fragment = decodeURI(location.slice(location.indexOf('#') + 1))
          .replace(/"/g, '\\"')
          .replace(/&/g, '","')
          .replace(/=/g, '":"')
        const token = JSON.parse(`{"${fragment}"}`)
        IMGUR_ACCESS_TOKEN = token.access_token

        resolve(`Bearer ${IMGUR_ACCESS_TOKEN}`)
      }).catch(reject)
    }).catch(reject)
  } else {
    resolve(`Client-ID ${IMGUR_CLIENT_ID}`)
  }
})

/**
* Set your credentials
* @link https://api.imgur.com/#register
* @param {string} username
* @param {string} password
* @param {string} clientId
*/
imgur.setCredentials = (username, password, clientId) => {
  if (clientId && typeof clientId === 'string') {
    IMGUR_CLIENT_ID = clientId
  }
  if (username && typeof username === 'string') {
    IMGUR_USERNAME = username
  }
  if (password && typeof password === 'string') {
    IMGUR_PASSWORD = password
  }
}


/**
* Attempt to load the client ID from disk
* @param   {string}  path - path to file with client id
* @returns {promise}
*/
imgur.loadClientId = (path = DEFAULT_CLIENT_ID_PATH) => new Promise((resolve, reject) => {
  fs.readFile(path, { encoding: 'utf8' }, (err, data) => {
    if (err) {
      reject(err)
    }

    if (!data) {
      reject('File is empty')
    }

    resolve(data)
  })
})


/**
* Attempt to save the client ID to disk
* @param   {string} clientId - client id
* @param   {string} path - path to save the client id to
* @returns {promise}
*/
imgur.saveClientId = (clientId, path = DEFAULT_CLIENT_ID_PATH) => new Promise((resolve, reject) => {
  if (!clientId) {
    reject('You did not provide a clientId')
  }

  fs.writeFile(path, clientId, (error) => {
    if (error) {
      reject(error)
    }

    resolve()
  })
})


/**
* Attempt to remove a saved client ID from disk
* NOTE: File remains but is emptied
*
* @param   {string} path - path to save the client id to
* @returns {promise}
*/
imgur.clearClientId = path => imgur.saveClientId('', path)


/**
* Set your client ID
* @link https://api.imgur.com/#register
* @param {string} clientId
*/
imgur.setClientId = (clientId) => {
  if (clientId && typeof clientId === 'string') {
    IMGUR_CLIENT_ID = clientId
  }
}


/**
* Get currently set client ID
* @returns {string} client ID
*/
imgur.getClientId = () => IMGUR_CLIENT_ID

/**
* Set Imgur API URL
* @link https://api.imgur.com/#register or https://imgur-apiv3.p.mashape.com
* @param {string} URL - URL to make the API calls to imgur
*/
imgur.setAPIUrl = (URL) => {
  if (URL && typeof URL === 'string') {
    IMGUR_API_URL = URL
  }
}

/**
* Get Imgur API Url
* @returns {string} API Url
*/
imgur.getAPIUrl = () => IMGUR_API_URL

/**
* Set Mashape Key
* @link https://market.mashape.com/imgur/imgur-9
* @param {string} mashapeKey
*/
imgur.setMashapeKey = (mashapeKey) => {
  if (mashapeKey && typeof mashapeKey === 'string') {
    IMGUR_MASHAPE_KEY = mashapeKey
  }
}
/**
* Get Mashape Key
* @returns {string} Mashape Key
*/
imgur.getMashapeKey = () => IMGUR_MASHAPE_KEY

/**
* Delete image
* @param {string} deletehash - deletehash of the image generated during upload
* @returns {promise}
*/
imgur.deleteImage = deletehash => new Promise((resolve, reject) => {
  if (!deletehash) {
    reject('Missing deletehash')
  }

  imgur.imgurRequest('delete', deletehash)
    .then(resolve)
    .catch(reject)
})

/**
* Get image metadata
* @param   {string}  id - unique image id
* @returns {promise}
*/
imgur.getInfo = id => new Promise((resolve, reject) => {
  if (!id) {
    reject('Invalid image ID')
  }

  imgur.imgurRequest('info', id).then(resolve).catch(reject)
})


/**
* Create an album
* @returns {promise}
*/
imgur.createAlbum = () => imgur.imgurRequest('createAlbum', 'dummy')


/**
* Get album metadata
* @param   {string}  id - unique album id
* @returns {promise}
*/
imgur.getAlbumInfo = id => new Promise((resolve, reject) => {
  if (!id) {
    reject('Invalid album ID')
  }

  imgur.imgurRequest('album', id)
    .then(resolve)
    .catch(reject)
})

imgur.search = (query, options = {}) => new Promise((resolve, reject) => {
  const queryError = imgur.checkQuery(query)
  let params

  if (queryError) {
    reject(queryError)
  } else {
    params = imgur.initSearchParams(query, options)

    imgur.imgurRequest('search', params.queryStr)
      .then((json) => {
        const copyOfParams = params
        delete copyOfParams.queryStr

        return resolve({ data: json.data, params: copyOfParams })
      })
      .catch(reject)
  }
})

imgur.checkQuery = (query) => {
  let errMsg

  if (!query) {
    errMsg = 'Search requires a query. Try searching with a query (e.g cats).'
  } else if (typeof query !== 'string') {
    errMsg = 'You did not pass a string as a query.'
  } else {
    errMsg = ''
  }

  return errMsg
}


imgur.initSearchParams = (query, options) => {
  const params = {
    sort: 'time',
    dateRange: 'all',
    page: '1',
  }

  for (const key of Object.keys(options)) {
    if (key === 'sort' || key === 'dateRange' || key === 'page') {
      params[key] = params[key] !== options[key] ? options[key] : params[key]
    }
  }

  let queryStr = ''
  Object.keys(params).forEach((param) => {
    queryStr += `/${params[param]}`
  })

  queryStr += `?q=${query}`
  params.queryStr = queryStr

  return params
}


/**
* Upload an image file
* @param   {string}  file - path to a binary image file
* @param   {string=} albumId - the album id to upload to
* @param   {string=} title - the title of the image
* @param   {string=} description - the description of the image
* @returns {promise}
*/
imgur.uploadFile = (file, albumId, title, description) => new Promise((resolve, reject) => {
  const extraFormParams = {}

  if (typeof albumId === 'string' && albumId.length) {
    extraFormParams.album = albumId
  }

  if (typeof title === 'string' && title.length) {
    extraFormParams.title = title
  }

  if (typeof description === 'string' && description.length) {
    extraFormParams.description = description
  }

  // eslint-disable-next-line
  glob(file, (error, files) => {
    if (error) {
      reject(error)
    }

    if (!files.length) {
      reject('Invalid file or glob')
    }

    files.forEach((f) => {
      const readStream = fs.createReadStream(f)

      readStream.on('error', reject)

      // eslint-disable-next-line
      imgur.imgurRequest('upload', readStream, extraFormParams)
        .then(resolve)
        .catch(reject)
    })
  })
})


/**
* Upload a url
* @param   {string}  url - address to an image on the web
* @param   {string=} albumId - the album id to upload to
* @param   {string=} title - the title of the image
* @param   {string=} description - the description of the image
* @returns {promise}
*/
imgur.uploadUrl = (url, albumId, title, description) => new Promise((resolve, reject) => {
  const extraFormParams = {}

  if (typeof albumId === 'string' && albumId.length) {
    extraFormParams.album = albumId
  }

  if (typeof title === 'string' && title.length) {
    extraFormParams.title = title
  }

  if (typeof description === 'string' && description.length) {
    extraFormParams.description = description
  }

  if (!url) {
    reject('You pass an empty url')
  }

  if (!urlParser.parse(url).protocol) {
    reject('You provided an invalid url (protocol)')
  }

  imgur.imgurRequest('upload', url, extraFormParams)
    .then(resolve)
    .catch(reject)
})


/**
* Upload a Base64-encoded string
* @link http://en.wikipedia.org/wiki/Base64
* @param   {string} base64 - a base-64 encoded string
* @param   {string=} albumId - the album id to upload to
* @param   {string=} title - the title of the image
* @param   {string=} description - the description of the image
* @returns {promise} - on resolve, returns the resulting image object from imgur
*/
imgur.uploadBase64 = (base64, albumId, title, description) => new Promise((resolve, reject) => {
  const extraFormParams = {}

  if (typeof albumId === 'string' && albumId.length) {
    extraFormParams.album = albumId
  }

  if (typeof title === 'string' && title.length) {
    extraFormParams.title = title
  }

  if (typeof description === 'string' && description.length) {
    extraFormParams.description = description
  }

  if (!base64) {
    reject('You did not pass base64 image')
  }

  if (typeof base64 !== 'string') {
    reject('Invalid Base64 input')
  }

  if (!base64.length) {
    reject('You pass empty base64 string')
  }

  imgur.imgurRequest('upload', base64, extraFormParams)
    .then(resolve)
    .catch(reject)
})

/**
* Upload an entire album of images
* @param   {Array} images - array of image strings of desired type
* @param   {string} uploadType - the type of the upload ('File', 'Url', 'Base64')
* @param   {boolean=} failSafe - if true, it won't fail on invalid or empty image input
*                           and will return an object with empty album data and an empty image array
* @returns {promise} - on resolve, returns an object with the album data and and an array of
*                      image data objects {data: {...}, images: [{...}, ...]}
*/
imgur.uploadAlbum = (images, uploadType, failSafe) => new Promise((resolve, reject) => {
  const checkFailSafe = (message) => {
    if (failSafe) {
      resolve({ data: {}, images: [] })
    } else {
      reject(message)
    }
  }

  if (!images) {
    checkFailSafe('You did not provide any image')
  }

  if (!images.length) {
    checkFailSafe('You provided an empty array of images')
  }

  if (!(typeof images === 'string' || images instanceof Array)) {
    checkFailSafe('Invalid image input, only arrays supported')
  }

  imgur.createAlbum()
    .then(album => (
      imgur.uploadImages(images, uploadType, album.data.id)
        .then(resImages => resolve({ data: album.data, images: resImages }))
    ))
    .catch(reject)
})

/**
* Upload an entire album of images
* @param {Array} images  - array of image strings of desired type
* @param {string} uploadType - the type of the upload ('File', 'Url', 'Base64')
* @param {string=} albumId - the album id to upload to
* @returns {promise} - on resolve, returns an array of image data objects
*  {album: {...}, images: [{...}, ...]}
*/
imgur.uploadImages = (images, uploadType, albumId) => new Promise((resolve, reject) => {
  const upload = imgur[`upload${uploadType}`]

  if (!images) {
    reject('You did not pass any image')
  }

  if (!images.length) {
    reject('You pass an empty images array')
  }

  if (!(typeof images === 'string' || images instanceof Array)) {
    reject('Invalid image input, only Arrays are supported')
  }

  const imagesToUpload = [].concat(images).map(image => upload(image, albumId))
  Promise.all(imagesToUpload)
    .then(image => image.data)
    .then(resolve)
    .catch(reject)
})

/**
* Get current credit limits
* @returns {promise}
*/
// eslint-disable-next-line
imgur.getCredits = () => imgur.imgurRequest('credits')

module.exports = imgur
