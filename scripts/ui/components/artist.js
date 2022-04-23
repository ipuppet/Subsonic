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
        this.artist = await this.kernel.subsonic.getArtist(id)
    }

    getPageController() {
        this.albums.setViewController(this.viewController).init(this.artist.albums, this.artist.name)
        return this.albums.getPageController()
    }
}

module.exports = Artist