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
        this.starButtonWidth = 25
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

    get listData() {
        return this.album.songs.map(item => ({
            number: {
                text: item.track
            },
            title: {
                text: item.title
            },
            star: {
                info: item,
                symbol: this.kernel.subsonic.isStarred("songs", item.id) ? "star.fill" : "star"
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
                        make.right.inset(this.edgeOffset * 2 + this.starButtonWidth)
                    }
                },
                {
                    type: "spinner",
                    props: {
                        loading: true,
                        hidden: true
                    },
                    layout: (make, view) => {
                        make.right.inset(this.edgeOffset)
                        make.centerY.equalTo(view.super)
                    }
                },
                {
                    type: "button",
                    props: {
                        id: "star",
                        bgcolor: $color("clear")
                    },
                    events: {
                        tapped: async sender => {
                            // 防止重复点击
                            if (sender.prev.hidden === false) {
                                return
                            }

                            sender.prev.hidden = false
                            sender.hidden = true

                            if (sender.symbol === "star") {
                                await this.kernel.subsonic.star(sender.info.id)
                            } else {
                                await this.kernel.subsonic.unstar(sender.info.id)
                            }

                            sender.prev.hidden = true
                            sender.hidden = false

                            $(this.listId).data = this.listData
                        }
                    },
                    layout: (make, view) => {
                        make.right.inset(0)
                        make.width.equalTo(this.starButtonWidth + this.edgeOffset * 2)
                        make.height.equalTo(view.super)
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
                template: this.listTemplate
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    const info = data.star.info
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