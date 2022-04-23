const {
    UIKit,
    PageController
} = require("../../lib/easy-jsbox")

class Album {
    title
    album = {
        name: $l10n("SONGS"),
        songs: []
    }

    constructor(kernel) {
        this.kernel = kernel
        this.listId = "album-list"

        this.edgeOffset = 15
        this.numberWidth = 28
        this.imageHeight = UIKit.windowSize.width * 0.6
        this.albumInfoHeight = 55
        this.rowHeight = 50
    }

    setViewController(viewController) {
        this.viewController = viewController
        return this
    }

    async init(albumId) {
        this.album = await this.kernel.subsonic.getAlbum(albumId)
    }

    get header() {
        return {
            type: "view",
            props: {
                height: this.imageHeight + this.edgeOffset * 2 + this.albumInfoHeight,
            },
            views: [
                {
                    type: "image",
                    props: {
                        id: "image",
                        cornerRadius: 10,
                        smoothCorners: true,
                        src: this.kernel.subsonic.getCoverArt(this.album.coverArt)
                    },
                    layout: (make, view) => {
                        make.top.equalTo(view.super).offset(15)
                        make.centerX.equalTo(view.super)
                        make.size.equalTo(this.imageHeight)
                    }
                },
                {
                    type: "label",
                    props: {
                        lines: 1,
                        font: $font(20),
                        text: this.album.artist
                    },
                    layout: (make, view) => {
                        make.centerX.equalTo(view.super)
                        make.top.equalTo(view.prev.bottom).offset(this.edgeOffset)
                    }
                },
                {
                    type: "label",
                    props: {
                        lines: 1,
                        font: $font(16),
                        color: $color("secondaryText"),
                        text: (this.album.genre ? this.album.genre + " · " : "") + this.album.year
                    },
                    layout: (make, view) => {
                        make.centerX.equalTo(view.super)
                        make.top.equalTo(view.prev.bottom)
                    }
                }
            ],
            layout: $layout.fill
        }
    }

    get menuData() {
        return {}
    }

    get listData() {
        return this.album.songs.map(item => ({
            info: { info: item },
            number: {
                text: item.track
            },
            image: {
                src: this.kernel.subsonic.getCoverArt(item.coverArt)
            },
            title: {
                text: item.title
            },
            artist: {
                text: item.artist
            }
        }))
    }

    get listTemplate() {
        return {
            props: { bgcolor: $color("clear") },
            views: [
                {
                    type: "label",
                    props: {
                        id: "number",
                        lines: 1,
                        align: $align.center,
                        color: $color("secondaryText"),
                        font: $font(16)
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.width.equalTo(this.numberWidth)
                        make.left.equalTo(view.super.safeArea).offset(this.edgeOffset)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "title",
                        lines: 1,
                        font: $font(16)
                    },
                    layout: (make, view) => {
                        make.centerY.equalTo(view.super)
                        make.left.equalTo(view.prev.right).offset(this.edgeOffset / 2)
                    }
                }
            ]
        }
    }

    getListView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                bgcolor: UIKit.primaryViewBackgroundColor,
                separatorInset: $insets(0, this.numberWidth + this.edgeOffset * 1.5, 0, 0),
                rowHeight: this.rowHeight,
                header: this.header ?? {},
                data: this.listData,
                template: this.listTemplate,
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    const info = data.info.info
                    this.kernel.player.insert(info)
                }
            }
        }
    }

    getPageController() {
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle(this.album.name)
            .setFixedFooterView(this.kernel.player.fixedFooterView())
        pageController
            .navigationController
            .navigationBar
            .setBackgroundColor(UIKit.primaryViewBackgroundColor)
        pageController.setView(this.getListView())
        return pageController
    }
}

module.exports = Album