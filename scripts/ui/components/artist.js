const Albums = require("./albums")

class Artist {
    artist = {}

    constructor(kernel) {
        this.kernel = kernel
        this.albums = new Albums(kernel)
    }

    setViewController(viewController) {
        this.viewController = viewController
        return this
    }

    async init(id) {
        await this.kernel.subsonic.getArtist(id).then(artist => {
            this.artist = artist
        })
    }

    getPageController() {
        this.albums.setViewController(this.viewController).init(this.artist.albums, this.artist.name)
        return this.albums.getPageController()
    }
}

module.exports = Artist