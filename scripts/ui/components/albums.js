const {
    UIKit,
    PageController,
    SearchBar
} = require("../../lib/easy-jsbox")
const Album = require("./album")

class Albums {
    title
    albums = []
    page = 0
    pageSize = 20
    hasSource = false

    constructor(kernel) {
        this.kernel = kernel
        this.matrixId = "albums-matrix"

        this.columns = 2
        this.spacing = 20
        this.imageHeight = (UIKit.windowSize.width - this.spacing * (this.columns + 1)) / this.columns
        this.infoHeight = 40
    }

    setViewController(viewController) {
        this.viewController = viewController
        return this
    }

    async init(albums, title = $l10n("ALBUMS")) {
        this.title = title

        if (albums !== undefined) {
            this.albums = albums
            this.hasSource = true
        } else {
            return new Promise(async (resolve, reject) => {
                await this.kernel.subsonic.getAlbumList2(this.pageSize, this.pageSize * this.page).then(albums => {
                    ++this.page
                    this.albums = albums
                    resolve()
                }).catch(error => reject(error))
            })
        }
    }

    searchAction(text) { }

    get menuItems() {
        return []
    }

    get matrixData() {
        return this.albums.map(itme => ({
            info: { info: itme },
            image: {
                src: this.kernel.subsonic.getCoverArt(itme.coverArt)
            },
            name: {
                text: itme.name
            },
            artist: {
                text: itme.artist
            }
        }))
    }

    get matrixTemplate() {
        return {
            props: {
                bgcolor: $color("clear")
            },
            views: [
                { // 用来保存信息
                    type: "view",
                    props: {
                        id: "info",
                        hidden: true
                    }
                },
                {
                    type: "image",
                    props: {
                        id: "image",
                        cornerRadius: 10,
                        smoothCorners: true
                    },
                    layout: make => {
                        make.top.left.inset(0)
                        make.size.equalTo($size(this.imageHeight, this.imageHeight))
                    }
                },
                {
                    type: "spinner",
                    props: {
                        cornerRadius: 10,
                        smoothCorners: true,
                        bgcolor: $rgba(0, 0, 0, 0.5),
                        loading: true,
                        hidden: true
                    },
                    layout: (make, view) => {
                        make.size.equalTo(view.prev)
                        make.edges.equalTo(view.prev)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "name",
                        font: $font(16)
                    },
                    layout: (make, view) => {
                        make.top.equalTo(view.prev.bottom).offset(3)
                        make.width.equalTo(view.super)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "artist",
                        font: $font(14),
                        color: $color("secondaryText")
                    },
                    layout: (make, view) => {
                        make.top.equalTo(view.prev.bottom)
                        make.width.equalTo(view.super)
                    }
                }
            ]
        }
    }

    getMatrixView() {
        return {
            type: "matrix",
            props: {
                id: this.matrixId,
                columns: this.columns,
                itemHeight: this.imageHeight + this.infoHeight,
                spacing: this.spacing,
                data: this.matrixData,
                template: this.matrixTemplate
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    // 防止重复点击
                    if (sender.cell(indexPath).get("spinner").hidden === false) {
                        return
                    }

                    sender.cell(indexPath).get("spinner").hidden = false
                    const albums = new Album(this.kernel)
                    albums.setViewController(this.viewController)
                        .init(data.info.info.id)
                        .then(() => {
                            sender.cell(indexPath).get("spinner").hidden = true
                            this.viewController.push(albums.getPageController())
                        })
                },
                didReachBottom: sender => {
                    if (!this.hasSource) {
                        $ui.toast("fetching...")
                        this.kernel.subsonic.getAlbumList2(this.pageSize, this.pageSize * this.page).then(albums => {
                            ++this.page
                            sender.endFetchingMore()
                            this.albums = this.albums.concat(albums)
                            sender.data = this.matrixData
                            resolve()
                        }).catch(error => reject(error))
                    }
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
            // TODO .setTitleView(searchBar)
            .setFixedFooterView(this.kernel.player.fixedFooterView())
        pageController
            .navigationController
            .navigationBar
            .setBackgroundColor(UIKit.primaryViewBackgroundColor)
        if (this.kernel.isUseJsboxNav) {
            pageController
                .navigationController
                .navigationBar
                .withoutStatusBarHeight()
        }
        pageController.setView(this.getMatrixView())
        return pageController
    }
}

module.exports = Albums