const {
    UIKit,
    PageController,
    SearchBar
} = require("../../libs/easy-jsbox")
const Artist = require("./artist")

class ArtistIndexes {
    artistIndexes = {}
    artistIndexesKeys = []

    constructor(kernel) {
        this.kernel = kernel
        this.listId = "artist-indexes-list"

        this.edgeOffset = 15
        this.imageSize = 50
        this.rowHeight = 60
    }

    setViewController(viewController) {
        this.viewController = viewController
        return this
    }

    async init() {
        this.artistIndexes = await this.kernel.subsonic.getIndexes()
        this.artistIndexesKeys = Object.keys(this.artistIndexes)
    }

    searchAction(text) { }

    get listData() {
        return this.artistIndexesKeys.map(index => ({
            title: index,
            rows: this.artistIndexes[index].map(item => ({
                info: { info: item },
                image: {
                    src: item.artistImageUrl
                },
                name: {
                    text: item.name
                },
                albumCount: {
                    text: $l10n("ALBUMS") + ": " + item.albumCount
                }
            }))
        }))
    }

    get listTemplate() {
        return {
            props: { bgcolor: $color("clear") },
            views: [
                {
                    type: "view",
                    props: { id: "info" }
                },
                {
                    type: "image",
                    props: {
                        id: "image",
                        cornerRadius: this.imageSize / 2,
                        smoothCorners: true
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
                        id: "name",
                        lines: 1,
                        font: $font(22)
                    },
                    layout: (make, view) => {
                        make.left.equalTo(view.prev.right).offset(this.edgeOffset)
                        make.top.equalTo(view.prev)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "albumCount",
                        lines: 1,
                        font: $font(16),
                        color: $color("secondaryText")
                    },
                    layout: (make, view) => {
                        make.bottom.equalTo(view.prev.prev)
                        make.left.equalTo(view.prev)
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
                stickyHeader: true,
                rowHeight: this.rowHeight,
                data: this.listData,
                template: this.listTemplate,
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    // ??????????????????
                    if (sender.cell(indexPath).get("spinner").hidden === false) {
                        return
                    }

                    sender.cell(indexPath).get("spinner").hidden = false
                    const id = data.info.info.id
                    const artist = new Artist(this.kernel)
                    artist.setViewController(this.viewController).init(id).then(() => {
                        sender.cell(indexPath).get("spinner").hidden = true
                        this.viewController.push(artist.getPageController())
                    })
                }
            }
        }
    }

    getPageController() {
        const searchBar = new SearchBar()
        // ?????????????????????
        searchBar.controller.setEvent("onChange", text => this.searchAction(text))
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle($l10n("ARTISTS"))
            // TODO .setTitleView(searchBar)
            .setFixedFooterView(this.kernel.player.fixedFooterView())
            .addRightButton({
                symbol: "paperplane",
                menu: {
                    pullDown: true,
                    asPrimary: true,
                    items: this.artistIndexesKeys.map((index, i) => ({
                        title: index,
                        handler: () => {
                            $(this.listId).scrollTo({
                                indexPath: $indexPath(i, 0)
                            })
                        }
                    }))
                }
            })
        pageController
            .navigationController
            .navigationBar
            .setBackgroundColor(UIKit.primaryViewBackgroundColor)
        pageController.setView(this.getListView())
        return pageController
    }
}

module.exports = ArtistIndexes