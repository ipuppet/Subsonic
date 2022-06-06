const {
    UIKit,
    PageController,
    SearchBar
} = require("../../libs/easy-jsbox")

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
        this.starButtonWidth = 25
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
            this.songs = await this.kernel.subsonic.getRandomSongs()
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

    get listData() {
        return this.songs.map(item => ({
            image: {
                src: this.kernel.subsonic.getCoverArt(item.coverArt)
            },
            title: {
                text: item.title
            },
            artist: {
                text: item.artist
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
                        make.right.inset(this.edgeOffset * 2 + this.starButtonWidth)
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
                        make.right.inset(this.edgeOffset * 2 + this.starButtonWidth)
                        make.left.equalTo(view.prev)
                        make.bottom.equalTo(view.prev.prev).offset(-5)
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
                separatorInset: $insets(0, this.imageSize + this.edgeOffset * 2, 0, 0),
                rowHeight: this.rowHeight,
                data: this.listData,
                template: this.listTemplate
            },
            events: {
                didSelect: (sender, indexPath, data) => {
                    const info = data.star.info
                    this.kernel.player.insert(info)
                }
            },
            layout: $layout.fill
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