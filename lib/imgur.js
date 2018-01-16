const imgur = exports;
const request = require('request');
const fs = require('fs');
const urlParser = require('url');
const glob = require('glob');

// The following client ID is tied to the
// registered 'node-imgur' app and is available
// here for public, anonymous usage via this node
// module only.
let IMGUR_API_URL = process.env.IMGUR_API_URL || 'https://api.imgur.com/3/';
let IMGUR_MASHAPE_KEY = process.env.IMGUR_MASHAPE_KEY || '';
let IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || 'f0ea04148a54268';
let IMGUR_USERNAME = null;
let IMGUR_PASSWORD = null;
let IMGUR_ACCESS_TOKEN = null;

// An IIFE that returns the OS-specific home directory
// as a location to optionally store the imgur client id
const DEFAULT_CLIENT_ID_PATH = (() => {
  const envHome = (process.platform === 'win32') ? 'USERPROFILE' : 'HOME';
  return `${process.env[envHome]}/.imgur`;
})();

imgur.VERSION = require('../package.json').version;

/**
 * Send a request to imgur's public API
 *
 * @param   {string}  operation - operation to perform; 'info' or 'upload'
 * @param   {mixed}   payload - image data
 * @returns {promise}
 */
imgur._imgurRequest = (operation, payload, extraFormParams) => {
  const options = {
    uri: IMGUR_API_URL,
    method: null,
    encoding: 'utf8',
    json: true,
  };
  let form = null;

  if (!operation || typeof operation !== 'string' || (!payload && operation !== ('credits' && 'search'))) {
    return Promise.reject(new Error('Invalid argument'));
  }

  switch (operation) {
    case 'upload':
      options.method = 'POST';
      options.uri += 'image';
      break;
    case 'credits':
      options.method = 'GET';
      options.uri += 'credits';
      break;
    case 'info':
      options.method = 'GET';
      options.uri += `image/${payload}`;
      break;
    case 'album':
      options.method = 'GET';
      options.uri += `album/${payload}`;
      break;
    case 'createAlbum':
      options.method = 'POST';
      options.uri += 'album';
      break;
    case 'delete':
      options.method = 'DELETE';
      options.uri += `image/${payload}`;
      break;
    case 'search':
      options.method = 'GET';
      options.uri += `/gallery/search/${payload}`;
      break;
    default:
      return Promise.reject(new Error('Invalid operation'));
  }

  return new Promise((resolve, reject) => {
    imgur._getAuthorizationHeader()
      .then((authorizationHeader) => {
        if (IMGUR_MASHAPE_KEY) {
          options.headers = {
            Authorization: authorizationHeader,
            'X-Mashape-Key': IMGUR_MASHAPE_KEY,
          };
        } else {
          options.headers = {
            Authorization: authorizationHeader,
          };
        }

        const r = request(options, (err, res, body) => {
          if (err) {
            reject(err);
          } else if (body && !body.success) {
            reject(new Error(body.data ? body.data.error : 'No body data response'));
          } else {
            resolve(body);
          }
        });

        if (operation === 'upload') {
          form = r.form();
          form.append('image', payload);

          if (typeof extraFormParams === 'object') {
            Object.entries(extraFormParams).forEach(([param, value]) => {
              form.append(param, value);
            });
          }
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/**
 * Make a request, handling potential errors
 *
 * @param {object} options
 * @returns {promise}
 */
imgur._request = options => new Promise((resolve, reject) => {
  request(options, (err, res) => {
    if (err) {
      reject(err);
    } else {
      resolve(res);
    }
  });
});

/**
 * Get imgur access token using credentials
 *
 * @returns {promise}
 */
imgur._getAuthorizationHeader = () => new Promise((resolve, reject) => {
  if (IMGUR_ACCESS_TOKEN) {
    resolve(`Bearer ${IMGUR_ACCESS_TOKEN}`);
  } else if (IMGUR_USERNAME && IMGUR_PASSWORD) {
    const options = {
      uri: 'https://api.imgur.com/oauth2/authorize',
      method: 'GET',
      encoding: 'utf8',
      qs: {
        client_id: IMGUR_CLIENT_ID,
        response_type: 'token',
      },
    };
    imgur._request(options).then((res) => {
      const authorizeToken = res.headers['set-cookie'][0].match(/(^|;)[\s]*authorize_token=([^;]*)/)[2];
      options.method = 'POST';
      options.json = true;
      options.form = {
        username: IMGUR_USERNAME,
        password: IMGUR_PASSWORD,
        allow: authorizeToken,
      };

      options.headers = {
        Cookie: `authorize_token=${authorizeToken}`,
      };

      imgur._request(options).then(() => {
        const [location] = res.headers;
        const token = JSON.parse(`{"${decodeURI(location.slice(location.indexOf('#') + 1)).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"')}"}`);
        IMGUR_ACCESS_TOKEN = token.access_token;
        resolve(`Bearer ${IMGUR_ACCESS_TOKEN}`);
      }).catch((err) => {
        reject(err);
      });
    }).catch((err) => {
      reject(err);
    });
  } else {
    resolve(`Client-ID ${IMGUR_CLIENT_ID}`);
  }
});

/**
 * Set your credentials
 * @link https://api.imgur.com/#register
 * @param {string} username
 * @param {string} password
 * @param {string} clientId
 */
imgur.setCredentials = (username, password, clientId) => {
  if (clientId && typeof clientId === 'string') {
    IMGUR_CLIENT_ID = clientId;
  }
  if (username && typeof username === 'string') {
    IMGUR_USERNAME = username;
  }
  if (password && typeof password === 'string') {
    IMGUR_PASSWORD = password;
  }
};

/**
 * Attempt to load the client ID from disk
 * @param   {string}  path - path to file with client id
 * @returns {promise}
 */
imgur.loadClientId = (path = DEFAULT_CLIENT_ID_PATH) =>
  new Promise((resolve, reject) => {
    fs.readFile(path, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        reject(err);
      }

      if (!data) {
        reject(new Error('File is empty'));
      }

      resolve(data);
    });
  });

/**
 * Attempt to save the client ID to disk
 * @param   {string} path - path to save the client id to
 * @returns {promise}
 */
imgur.saveClientId = (clientId, path = DEFAULT_CLIENT_ID_PATH) =>
  new Promise((resolve, reject) => {
    fs.writeFile(path, clientId, (err) => {
      if (err) {
        reject(err);
      }

      resolve();
    });
  });

/**
 * Attempt to remove a saved client ID from disk
 * NOTE: File remains but is emptied
 *
 * @param   {string} path - path to save the client id to
 * @returns {promise}
 */
imgur.clearClientId = (path) => {
  imgur.saveClientId('', path);
};

/**
 * Set your client ID
 * @link https://api.imgur.com/#register
 * @param {string} clientId
 */
imgur.setClientId = (clientId) => {
  if (clientId && typeof clientId === 'string') {
    IMGUR_CLIENT_ID = clientId;
  }
};

/**
 * Get currently set client ID
 * @returns {string} client ID
 */
imgur.getClientId = () => IMGUR_CLIENT_ID;

/**
 * Set Imgur API url
 * @link https://api.imgur.com/#register or https://imgur-apiv3.p.mashape.com
 * @param {string} url - url to make the API calls to imgur
 */
imgur.setAPIUrl = (url) => {
  if (url && typeof url === 'string') {
    IMGUR_API_URL = url;
  }
};

/**
 * Get Imgur API Url
 * @returns {string} API Url
 */
imgur.getAPIUrl = () => IMGUR_API_URL;

/**
 * Set Mashape Key
 * @link https://market.mashape.com/imgur/imgur-9
 * @param {string} mashapeKey
 */
imgur.setMashapeKey = (mashapeKey) => {
  if (mashapeKey && typeof mashapeKey === 'string') {
    IMGUR_MASHAPE_KEY = mashapeKey;
  }
};

/**
 * Get Mashape Key
 * @returns {string} Mashape Key
 */
imgur.getMashapeKey = () => IMGUR_MASHAPE_KEY;

/**
 * Delete image
 * @param {string} deletehash - deletehash of the image generated during upload
 * @returns {promise}
 */
imgur.deleteImage = deletehash => new Promise((resolve, reject) => {
  if (!deletehash) {
    reject(new Error('Missing deletehash'));
  }

  imgur._imgurRequest('delete', deletehash)
    .then((json) => {
      resolve(json);
    })
    .catch((err) => {
      reject(err);
    });
});

/**
 * Get image metadata
 * @param   {string}  id - unique image id
 * @returns {promise}
 */
imgur.getInfo = id => new Promise((resolve, reject) => {
  if (!id) {
    reject(new Error('Invalid image ID'));
  }

  imgur._imgurRequest('info', id)
    .then((json) => {
      resolve(json);
    })
    .catch((err) => {
      reject(err);
    });
});

/**
 * Create an album
 * @returns {promise}
 */
imgur.createAlbum = () => new Promise((resolve, reject) => {
  imgur._imgurRequest('createAlbum', 'dummy')
    .then((json) => {
      resolve(json);
    })
    .catch((err) => {
      reject(err);
    });
});

/**
 * Get album metadata
 * @param   {string}  id - unique album id
 * @returns {promise}
 */
imgur.getAlbumInfo = id => new Promise((resolve, reject) => {
  if (!id) {
    reject(new Error('Invalid album ID'));
  }

  imgur._imgurRequest('album', id)
    .then((json) => {
      resolve(json);
    })
    .catch((err) => {
      reject(err);
    });
});

/**
 * Search
 * @param   {string}  query - search query
 * @param   {string}  options - search options
 * @returns {promise}
 */
imgur.search = (query, options = {}) => new Promise((resolve, reject) => {
  const checkQuery = imgur._checkQuery(query);
  let params;

  if (checkQuery.constructor === Error) {
    reject(checkQuery);
  } else {
    params = imgur._initSearchParams(query, options);
    imgur._imgurRequest('search', params.queryStr)
      .then((json) => {
        const copyOfParams = params;
        delete copyOfParams.queryStr;
        resolve({ data: json.data, params: copyOfParams });
      })
      .catch((err) => {
        reject(err);
      });
  }
});

/**
 * Helper function for validating query
 * @param   {string}  query - search query
 * @returns {string}  error message
 */
imgur._checkQuery = (query) => {
  let errMsg;

  if (!query) {
    errMsg = new Error('Search requires a query. Try searching with a query (e.g cats).');
  } else if (typeof query !== 'string') {
    errMsg = new Error('You did not pass a string as a query.');
  } else {
    errMsg = '';
  }

  return errMsg;
};

/**
 * Helper function for initializing search parameters
 */
imgur._initSearchParams = (query, options) => {
  const params = { sort: 'time', dateRange: 'all', page: '1' };

  Object.keys(options).forEach((key) => {
    if (key === 'sort' || key === 'dateRange' || key === 'page') {
      params[key] = params[key] !== options[key] ? options[key] : params[key];
    }
  });

  let queryStr = '';
  Object.keys(params).forEach((param) => {
    queryStr += `/${params[param]}`;
  });
  queryStr += `?q=${query}`;
  params.queryStr = queryStr;
  return params;
};

/**
 * Upload an image file
 * @param   {string}  file - path to a binary image file
 * @param   {string=} albumId - the album id to upload to
 * @param   {string=} title - the title of the image
 * @param   {string=} description - the description of the image
 * @returns {promise}
 */
imgur.uploadFile = (file, albumId, title, description) => new Promise((resolve, reject) => {
  const extraFormParams = {};

  if (typeof albumId === 'string' && albumId.length) {
    extraFormParams.album = albumId;
  }

  if (typeof title === 'string' && title.length) {
    extraFormParams.title = title;
  }

  if (typeof description === 'string' && description.length) {
    extraFormParams.description = description;
  }

  glob(file, (err, files) => {
    if (err) {
      reject(err);
      return;
    } else if (!files.length) {
      reject(new Error('Invalid file or glob'));
      return;
    }

    files.forEach((f) => {
      const readStream = fs.createReadStream(f);
      readStream.on('error', reject);

      imgur._imgurRequest('upload', readStream, extraFormParams)
        .then((json) => {
          resolve(json);
        })
        .catch((e) => {
          reject(e);
        });
    });
  });
});

/**
 * Upload a url
 * @param   {string}  url - address to an image on the web
 * @param   {string=} albumId - the album id to upload to
 * @param   {string=} title - the title of the image
 * @param   {string=} description - the description of the image
 * @returns {promise}
 */
imgur.uploadUrl = (url, albumId, title, description) => new Promise((resolve, reject) => {
  const extraFormParams = {};

  if (typeof albumId === 'string' && albumId.length) {
    extraFormParams.album = albumId;
  }

  if (typeof title === 'string' && title.length) {
    extraFormParams.title = title;
  }

  if (typeof description === 'string' && description.length) {
    extraFormParams.description = description;
  }

  if (!url || !urlParser.parse(url).protocol) {
    reject(new Error('Invalid URL'));
    return;
  }

  imgur._imgurRequest('upload', url, extraFormParams)
    .then((json) => {
      resolve(json);
    })
    .catch((err) => {
      reject(err);
    });
});

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
  const extraFormParams = {};

  if (typeof albumId === 'string' && albumId.length) {
    extraFormParams.album = albumId;
  }

  if (typeof title === 'string' && title.length) {
    extraFormParams.title = title;
  }

  if (typeof description === 'string' && description.length) {
    extraFormParams.description = description;
  }

  if (typeof base64 !== 'string' || !base64 || !base64.length) {
    reject(new Error('Invalid Base64 input'));
    return;
  }

  imgur._imgurRequest('upload', base64, extraFormParams)
    .then((image) => {
      resolve(image);
    })
    .catch((err) => {
      reject(err);
    });
});

/**
 * Upload an entire album of images
 * @param   {Array} images - array of image strings of desired type
 * @param   {string} uploadType - the type of the upload ('File', 'Url', 'Base64')
 * @param   {boolean=} failSafe - if true, it won't fail on invalid or empty image input and will
 * return an object with empty album data and an empty image array
 * @returns {promise} - on resolve, returns an object with the album data and and an array of image
 * data objects {data: {...}, images: [{...}, ...]}
 */
imgur.uploadAlbum = (images, uploadType, failSafe) => new Promise((resolve, reject) => {
  if (!images || !images.length || !(typeof images === 'string' || images instanceof Array)) {
    if (failSafe) {
      resolve({ data: {}, images: [] });
    } else {
      reject(new Error('Invalid image input, only arrays supported'));
    }
  }

  imgur.createAlbum()
    .then((album) => {
      imgur.uploadImages(images, uploadType, album.data.id)
        .then((imgs) => {
          resolve({ data: album.data, images: imgs });
        })
        .catch(err => reject(err));
    })
    .catch(err => reject(err));
});

/**
 * Upload an entire album of images
 * @param {Array} images  - array of image strings of desired type
 * @param {string} uploadType - the type of the upload ('File', 'Url', 'Base64')
 * @param {string=} albumId - the album id to upload to
 * @returns {promise} - on resolve, returns an array of image data objects
 * {album: {...}, images: [{...}, ...]}
 */
imgur.uploadImages = (images, uploadType, albumId) => new Promise((resolve, reject) => {
  const upload = imgur[`upload${uploadType}`];

  if (!images || !images.length || !(typeof images === 'string' || images instanceof Array)) {
    reject(new Error('Invalid image input, only arrays supported'));
  }

  const results = [];
  images.forEach((value, index) => {
    upload(images[index], albumId)
      .then((image) => {
        results.push(image.data);
      })
      .catch((err) => {
        reject(err);
      });
  });

  resolve(results);
});

/**
 * Get current credit limits
 * @returns {promise}
 */
imgur.getCredits = () => new Promise((resolve, reject) => {
  imgur._imgurRequest('credits')
    .then((json) => {
      resolve(json);
    })
    .catch((err) => {
      reject(err);
    });
});
