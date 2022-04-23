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

        this.edgeOffset = 15
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

    searchAction(text) {
        this.searchTask?.cancel()
        text = text.trim()
        if (text === "") {
            return
        }
        this.searchTask = $delay(0.5, () => {
            let index = 0
            for (index = 0; index < this.songs.length; index++) {
                const title = this.songs[index]?.title?.toLowerCase()
                if (title.includes(text.toLowerCase())) {
                    break
                }
            }
            if (index < this.songs.length) {
                $(this.listId).scrollToOffset($point(0, index * this.rowHeight))

                // highlight
                $delay(0.8, () => {
                    $ui.animate({
                        duration: 0.4,
                        animation: () => {
                            $(this.listId).cell($indexPath(0, index)).bgcolor = $color("lightGray")
                        },
                        completion: () => {
                            $delay(0.4, () => {
                                $ui.animate({
                                    duration: 0.4,
                                    animation: () => {
                                        $(this.listId).cell($indexPath(0, index)).bgcolor = UIKit.primaryViewBackgroundColor
                                    }
                                })
                            })
                        }
                    })
                })
            } else {
                $ui.toast($l10n("NO_RESULTS"))
            }
        })
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
                        make.left.inset(this.edgeOffset)
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
                        make.left.equalTo(view.prev.right).offset(this.edgeOffset)
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
                separatorInset: $insets(0, this.imageSize + this.edgeOffset * 2, 0, 0),
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
        const searchBar = new SearchBar()
        // 初始化搜索功能
        searchBar.controller.setEvent("onChange", text => this.searchAction(text))
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle(this.title)
            .setTitleView(searchBar)
            .pinTitleView()
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