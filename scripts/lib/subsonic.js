const { compressImage } = require("./easy-jsbox")

class SubsonicParameterError extends Error {
    constructor(parameter) {
        super(`Parameter "${parameter}" is undefined.`)
        this.name = "SubsonicError"
    }
}

class Subsonic {
    static client = "music-jsbox"
    static version = "v1.16.1"
    static salt = $text.uuid

    fileStorage

    host
    username
    password

    parameter = {}

    constructor({ host, username, password, fileStorage } = {}) {
        if (host && host[host.length - 1] === "/") {
            host = host.slice(0, host.length - 1)
        }
        this.host = host
        this.username = username
        this.password = password
        this.fileStorage = fileStorage
        this.init()
    }

    #checkParameter() {
        if (!this.host) {
            throw new SubsonicParameterError("host")
        }
        if (!this.username) {
            throw new SubsonicParameterError("username")
        }
        if (!this.password) {
            throw new SubsonicParameterError("password")
        }
    }

    async init() {
        await this.ping().catch(error => {
            $ui.success("Connect Error: " + error)
        })
    }

    parseParameter(parameter = {}) {
        const arr = []
        Object.keys(parameter).forEach(key => {
            const value = $text.URLEncode(parameter[key])
            arr.push(`${key}=${value}`)
        })
        return arr.join("&")
    }

    get authParameter() {
        this.parameter["c"] = Subsonic.client
        this.parameter["v"] = Subsonic.version
        this.parameter["s"] = Subsonic.salt
        this.parameter["u"] = this.username
        this.parameter["t"] = $text.MD5(this.password + this.parameter["s"])
        return this.parseParameter(this.parameter)
    }

    url(method, parameter = {}) {
        let p = this.parseParameter(parameter)
        if (p !== "") {
            p = "&" + p
        }
        return `${this.host}/rest/${method}?${this.authParameter}${p}`
    }

    cacheKey(method, parameter = {}) {
        return $text.MD5(`${this.username}${this.password}${this.host}${method}${this.parseParameter(parameter)}`)
    }

    request(method, parameter = {}, isCache = true) {
        try {
            this.#checkParameter()
        } catch (error) {
            $delay(0.3, () => {
                $ui.toast("Please Login")
            })
        }
        const displayError = message => {
            $ui.error(message)
            console.error(message)
        }

        const cacheKey = this.cacheKey(method, parameter)

        return new Promise(async (resolve, reject) => {
            try {
                if (isCache) {
                    const cache = this.fileStorage.read("request", cacheKey)
                    const xml = $xml.parse({
                        string: cache,
                        mode: "xml"
                    })
                    resolve(xml.rootElement)
                    return
                }
            } catch { }

            $http.get({
                url: this.url(method, parameter)
            }).then(response => {
                if (response.data.startsWith("4") || response.data.startsWith("5")) {
                    throw new Error(response.data)
                }

                const xml = $xml.parse({
                    string: response.data,
                    mode: "xml"
                })
                if (xml?.rootElement?.attributes?.status === "failed") {
                    const errorElement = xml?.rootElement?.firstChild({
                        tag: "error"
                    })
                    displayError(`code:[${errorElement.attributes.code}] ${errorElement.attributes.message}`)
                    reject(errorElement.attributes)
                } else {
                    if (isCache) {
                        this.fileStorage.writeSync("request", cacheKey, $data({ "string": response.data }))
                    }
                    resolve(xml?.rootElement)
                }
            }).catch(error => {
                displayError(error)
                reject(error)
            })
        })
    }

    binary(method, parameter = {}, isCache = true) {
        const url = this.url(method, parameter)
        const cacheKey = this.cacheKey(method, parameter)
        if (!isCache) {
            return url
        }

        const path = this.fileStorage.exists("binary", cacheKey)
        if (path) {
            return path
        } else {
            if (isCache) {
                $http.download({ url }).then(response => {
                    const image = compressImage(response.data.image)
                    this.fileStorage.writeSync("binary", cacheKey, image.jpg(0.8))
                })
            }
            return url
        }
    }

    song(id, isCache = true) {
        const url = this.url("stream", {
            id,
            format: "mp3"
        })
        const cacheKey = id + ".mp3"
        if (!isCache) {
            return url
        }

        const path = this.fileStorage.exists("song", cacheKey)
        if (path) {
            return path
        } else {
            if (isCache) {
                $http.download({ url }).then(response => {
                    this.fileStorage.writeSync("song", cacheKey, response.data)
                })
            }
            return url
        }
    }

    ping() {
        return this.request("ping", {}, false)
    }

    getMusicFolders(refresh = false) {
        return new Promise(async (resolve, reject) => {
            this.request("getMusicFolders", {}, !refresh).then(root => {
                resolve(root.firstChild({
                    tag: "musicFolders"
                }).children({
                    tag: "musicFolder"
                }))
            }).catch(e => reject(e))
        })
    }

    getIndexes(musicFolderId = 0, ifModifiedSince = false, refresh = false) {
        return new Promise(async (resolve, reject) => {
            this.request("getIndexes", Object.assign(
                {
                    musicFolderId: musicFolderId
                },
                ifModifiedSince ? { ifModifiedSince: ifModifiedSince } : {}
            ), !refresh).then(root => {
                const artistIndexes = {}
                root.firstChild({
                    tag: "indexes"
                }).children({
                    tag: "index"
                }).forEach(index => {
                    artistIndexes[index.attributes.name] = index.children({
                        tag: "artist"
                    }).map(item => item.attributes)
                })
                resolve(artistIndexes)
            }).catch(e => reject(e))
        })
    }

    getMusicDirectory(musicFolderId = 0) {
        return new Promise(async (resolve, reject) => {
            this.request("getMusicDirectory", {
                id: musicFolderId
            }).then(root => {
                resolve(root.firstChild({
                    tag: "musicFolders"
                }).children({
                    tag: "musicFolder"
                })).map(item => item.attributes)
            }).catch(e => reject(e))
        })
    }

    getArtist(id) {
        return new Promise(async (resolve, reject) => {
            this.request("getArtist", {
                id: id
            }).then(root => {
                const element = root.firstChild({
                    tag: "artist"
                })
                const artist = element.attributes
                artist.albums = element.children({
                    tag: "album"
                }).map(item => item.attributes)
                resolve(artist)
            }).catch(e => reject(e))
        })
    }

    getAlbumList2(size = 20, offset = 0) {
        return new Promise(async (resolve, reject) => {
            this.request("getAlbumList2", {
                size,
                offset,
                type: "alphabeticalByName"
            }).then(root => {
                resolve(root.firstChild({
                    tag: "albumList2"
                }).children({
                    tag: "album"
                }).map(item => item.attributes))
            }).catch(e => reject(e))
        })
    }

    getAlbum(id) {
        return new Promise(async (resolve, reject) => {
            this.request("getAlbum", {
                id: id
            }).then(root => {
                const element = root.firstChild({
                    tag: "album"
                })
                const album = element.attributes
                album.songs = element.children({
                    tag: "song"
                }).map(item => item.attributes)
                resolve(album)
            }).catch(e => reject(e))
        })
    }

    getCoverArt(id) {
        return this.binary("getCoverArt", { id })
    }

    getRandomSongs(size = 20) {
        return new Promise(async (resolve, reject) => {
            this.request("getRandomSongs", {
                size
            }, false).then(root => {
                resolve(root.firstChild({
                    tag: "randomSongs"
                }).children({
                    tag: "song"
                }).map(item => item.attributes))
            }).catch(e => reject(e))
        })
    }
}

module.exports = Subsonic