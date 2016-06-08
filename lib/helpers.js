function isFilePath(path) {
    return /(?:\.([^.]+))?$/.exec(path)[1] ? true : false;
}

function parseJson(j) {
    var parsed = {};
    try {
        parsed = JSON.parse(j);
    } catch(e) {
        console.warn(e);
    }
    return parsed;
}

function getPropSafely(obj, key) {
  if (typeof obj === 'object' && obj !== null) {
    return obj.hasOwnProperty(key) ? obj[key] : undefined;
  }
  return undefined;
}

module.exports = {
    isFilePath,
    parseJson,
    getPropSafely
}
