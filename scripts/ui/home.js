const {
    UIKit,
    PageController,
    ViewController
} = require("../lib/easy-jsbox")

class Home {
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "home-list"
        this.viewController = new ViewController()
        this.viewController.setEvent("onPop", () => {
            this.kernel.player.baseId.pop()
            this.kernel.player.updatePlayNow()
            this.kernel.player.updateControlButton()
        })

        this.leftOffset = 15
        this.fontSize = 22
        this.iconSize = 25
        this.rowHeight = 50
    }

    get listData() {
        const data = [
            {
                icon: "square.stack",
                title: $l10n("ALBUMS"),
                info: {
                    id: "albums"
                }
            },
            {
                icon: "music.note",
                title: $l10n("SONGS"),
                info: {
                    id: "songs"
                }
            },
            {
                icon: "music.mic",
                title: $l10n("ARTISTS"),
                info: {
                    id: "artistIndexes"
                }
            }
        ]

        return data.map(item => ({
            icon: {
                symbol: item.icon
            },
            title: {
                text: item.title,
                info: item.info
            }
        }))
    }

    getListView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                bgcolor: UIKit.primaryViewBackgroundColor,
                separatorInset: $insets(0, this.leftOffset, 0, 0),
                rowHeight: this.rowHeight,
                data: this.listData,
                template: {
                    props: { bgcolor: $color("clear") },
                    views: [
                        {// >
                            type: "image",
                            props: {
                                id: "rightBtn",
                                symbol: "chevron.right",
                                tintColor: $color("secondaryText")
                            },
                            layout: (make, view) => {
                                make.centerY.equalTo(view.super)
                                make.right.inset(this.leftOffset)
                                make.size.equalTo(15)
                            }
                        },
                        { // 加载动画
                            type: "spinner",
                            props: {
                                loading: true,
                                hidden: true
                            },
                            layout: (make, view) => {
                                make.size.equalTo(view.prev)
                                make.left.top.equalTo(view.prev)
                            }
                        },
                        {
                            type: "image",
                            props: {
                                id: "icon"
                            },
                            layout: make => {
                                make.left.inset(this.leftOffset)
                                make.top.inset((this.rowHeight - this.iconSize) / 2)
                                make.height.equalTo(this.iconSize)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "title",
                                font: $font(this.fontSize),
                                lines: 1
                            },
                            layout: (make, view) => {
                                make.centerY.right.equalTo(view.super)
                                make.height.equalTo(this.rowHeight)
                                make.left.equalTo(this.iconSize + this.leftOffset * 2)
                            }
                        }
                    ]
                }
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    const id = data.title.info.id
                    const Component = require("./components/" + id)
                    const view = new Component(this.kernel)
                    sender.cell(indexPath).get("spinner").hidden = false
                    sender.cell(indexPath).get("rightBtn").hidden = true
                    view.setViewController(this.viewController).init().then(() => {
                        sender.cell(indexPath).get("spinner").hidden = true
                        sender.cell(indexPath).get("rightBtn").hidden = false
                        this.viewController.push(view.getPageController())
                    })
                }
            }
        }
    }

    getPageController() {
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle($l10n("LIBRARY"))
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
        pageController.setView(this.getListView())
        return pageController
    }
}

module.exports = Home