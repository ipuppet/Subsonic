const {
    UIKit,
    PageController,
    SearchBar
} = require("../../lib/easy-jsbox")

class Songs {
    title
    songs = []
    hasSource = false

    constructor(kernel) {
        this.kernel = kernel
        this.listId = "songs-list"

        this.leftOffset = 15
        this.imageSize = 50
        this.rowHeight = 60
    }

    setViewController(viewController) {
        this.viewController = viewController
        return this
    }

    async init(songs, title = $l10n("SONGS")) {
        this.title = title

        if (songs !== undefined) {
            this.songs = songs
            this.hasSource = true
        } else {
            return new Promise(async (resolve, reject) => {
                await this.kernel.subsonic.getRandomSongs().then(songs => {
                    this.songs = songs
                    resolve()
                }).catch(error => reject(error))
            })
        }
    }

    get menuData() {
        return {}
    }

    get listData() {
        return this.songs.map(item => ({
            info: { info: item },
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
                    type: "image",
                    props: {
                        id: "image"
                    },
                    layout: make => {
                        make.left.inset(this.leftOffset)
                        make.top.inset((this.rowHeight - this.imageSize) / 2)
                        make.size.equalTo(this.imageSize)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "title",
                        lines: 1,
                        font: $font(18)
                    },
                    layout: (make, view) => {
                        make.left.equalTo(view.prev.right).offset(this.leftOffset)
                        make.top.equalTo(view.prev).offset(5)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "artist",
                        lines: 1,
                        font: $font(14),
                        color: $color("secondaryText")
                    },
                    layout: (make, view) => {
                        make.left.equalTo(view.prev)
                        make.bottom.equalTo(view.prev.prev).offset(-5)
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
                separatorInset: $insets(0, this.imageSize + this.leftOffset * 2, 0, 0),
                rowHeight: this.rowHeight,
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
            .setTitle(this.title)
            .setFixedFooterView(this.kernel.player.fixedFooterView())
        if (!this.hasSource) {
            pageController.navigationItem.addRightButton({
                symbol: "arrow.clockwise",
                tapped: animate => {
                    animate.start()
                    this.kernel.subsonic.getRandomSongs(20, true).then(songs => {
                        this.songs = songs
                        $(this.listId).data = this.listData
                        animate.done()
                    }).catch(error => {
                        this.kernel.print(error)
                        animate.cancel()
                    })
                }
            })
        }
        pageController
            .navigationController
            .navigationBar
            .setBackgroundColor(UIKit.primaryViewBackgroundColor)
        pageController.setView(this.getListView())
        return pageController
    }
}

module.exports = Songs