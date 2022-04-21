const Albums = require("./albums")

class Artist {
    artist = {}

    constructor(kernel) {
        this.kernel = kernel
        this.albums = new Albums(kernel)
    }

    async init(id) {
        await this.kernel.subsonic.getArtist(id).then(artist => {
            this.artist = artist
        })
    }

    getPageController() {
        this.albums.init(this.artist.albums, this.artist.name)
        return this.albums.getPageController()
    }
}

module.exports = Artist