class chineseSymbolAutoPairerPlugin extends BaseCustomPlugin {
    selector = () => this.utils.disableForeverSelector

    init = () => {
        this.pairMap = new Map(this.config.auto_pair_symbols);
        this.reversePairMap = this.reverseMap(this.pairMap);
        // 旧版本Typora是延迟加载SnapFlag的
        this.utils.loopDetector(
            () => File && File.editor && File.editor.undo && File.editor.undo.UndoManager && File.editor.undo.UndoManager.SnapFlag,
            () => this.undoSnapType = File.editor.undo.UndoManager.SnapFlag
        )
    }

    process = () => {
        const write = document.querySelector("#write");

        if (this.config.auto_delete_pair) {
            write.addEventListener("keydown", ev => {
                if (ev.key === "Backspace" && !ev.shiftKey && !ev.altKey && !this.utils.metaKeyPressed(ev)) {
                    this.deletePair();
                }
            }, true);
        }

        write.addEventListener("input", this.utils.throttle(ev => {
            const inputSymbol = ev.data;
            const pairSymbol = this.pairMap.get(inputSymbol);
            if (pairSymbol) {
                this.insertText(inputSymbol, pairSymbol);
            } else if (this.config.auto_skip && this.reversePairMap.get(inputSymbol)) {
                this.skipSymbol(inputSymbol);
            }
        }, 30));
    }

    insertText = (symbol, pairSymbol) => {
        const {range, node} = this.getRangy();
        const textNode = document.createTextNode(pairSymbol);
        range.insertNode(textNode);
        // range.setStart(textNode, symbol.length);
        // range.setEnd(textNode, symbol.length);
        // range.select();
        File.editor.undo.addSnap(node.cid, this.undoSnapType.REPLACE);
    }

    skipSymbol = inputSymbol => {
        const {node, bookmark} = this.getRangy();

        File.editor.undo.endSnap();
        File.editor.undo.addSnap(node.cid, this.undoSnapType.NONE);
        const ele = File.editor.findElemById(node.cid);
        if (ele.hasClass("md-fences")) return;

        const rawText = ele.rawText();
        if (inputSymbol === rawText.substring(bookmark.start, bookmark.start + 1)) {
            bookmark.end += 1;
            this.deleteContent(bookmark);
        }
    }

    deletePair = () => {
        const {node, bookmark} = this.getRangy();

        File.editor.undo.endSnap();
        File.editor.undo.addSnap(node.cid, this.undoSnapType.NONE);
        const ele = File.editor.findElemById(node.cid);
        if (ele.hasClass("md-fences")) return;

        const rawText = ele.rawText();
        const pair = rawText.substring(bookmark.start - 1, bookmark.start + 1);
        if (pair.length === 2) {
            const [left, right] = pair;
            if (this.reversePairMap.get(right) === left && this.pairMap.get(left) === right) {
                bookmark.end += 1;
                this.deleteContent(bookmark);
            }
        }
    }

    getRangy = () => {
        const range = File.editor.selection.getRangy();
        const markElem = File.editor.getMarkElem(range.anchorNode);
        const node = File.editor.findNodeByElem(markElem);
        const bookmark = range.getBookmark(markElem[0]);
        return {range, markElem, node, bookmark}
    }

    deleteContent = bookmark => {
        const newRange = File.editor.selection.rangy.createRange();
        newRange.moveToBookmark(bookmark);
        newRange.deleteContents();
    }

    reverseMap = map => {
        const result = new Map();
        map.forEach((value, key) => result.set(value, key));
        return result
    }
}

module.exports = {
    plugin: chineseSymbolAutoPairerPlugin
};