/**
 * Created by grzhan on 16/7/1.
 */
/// <reference path="../svgjs/svgjs.d.ts" />
import {TextSelector, SelectorDummyException} from './util/TextSelector';
import {Draw} from './util/Draw';

export enum Categories {
    'sign&symptom'=1,
    'diagnosis'=2,
    'assessment'=3,
    'treatment'=4,
    "index"=5,
    "drug"=6,
    "body location"=7,
    "frequency"=8,
    "value"=9,
    "change"=10,
    "modifier"=11,
}

export class Annotator {
    public svg;                // SVG Root DOM Element (wrapped by svg.js)
    public group = {};         // SVG Groups
    public lines = {};         // Content lines (including annotation parts and text parts)
    public category = [
        //{id:1, fill: 'rgb(250,214,137)', boader: 'rgb(217,171,66)', highlight: 'rgba(255,196,8,0.4)', text: '诊断'},
        //{id:2, fill: 'lightgreen', boader: '#148414', highlight: 'rgba(118,236,127,0.4)', text: '症状'},
        //{id:3, fill: 'rgb(165,222,228)', boader: 'rgb(120,194,196)', highlight: 'rgba(120,194,196,0.4)', text: '评估'},
        //{id:4, fill: 'rgb(235,122,119)', boader: 'rgb(219,77,109)', highlight: 'rgba(219,77,109,0.4)', text: '治疗'}
        {id:1, fill: 'rgb(174, 214, 241)',  boader: 'rgb(93, 173, 226)', highlight: 'rgb(174, 214, 241,0.4)', text: "疾病",},
        {id:2, fill: 'rgb(169, 204, 227)',  boader: 'rgb(84, 153, 199)', highlight: 'rgb(169, 204, 227,0.4)', text: "症状、表现",},
        {id:3, fill: 'rgb(210, 180, 222)',  boader: 'rgb(165, 105, 189)',highlight: 'rgb(210, 180, 222,0.4)', text: "检查、评分",},
        {id:4, fill: 'rgb(215, 189, 226)',  boader: 'rgb(175, 122, 197)',highlight: 'rgb(215, 189, 226,0.4)', text: "指标",},
        {id:5, fill: 'rgb(245, 183, 177)',  boader: 'rgb(236, 112, 99)', highlight: 'rgb(245, 183, 177,0.4)', text: "药物",},
        {id:6, fill: 'rgb(230, 176, 170)',  boader: 'rgb(205, 97, 85)',  highlight: 'rgb(230, 176, 170,0.4)', text: "治疗",},
        {id:7, fill: 'rgb(237, 187, 153)',  boader: 'rgb(245, 176, 65)', highlight: 'rgb(237, 187, 153,0.4)', text: "部位、方位",},
        {id:8, fill: 'rgb(245, 203, 167)',  boader: 'rgb(244, 208, 63)', highlight: 'rgb(245, 203, 167,0.4)', text: "时间",},
        {id:9, fill: 'rgb(250, 215, 160)',  boader: 'rgb(88, 214, 141)', highlight: 'rgb(250, 215, 160,0.4)', text: "频率",},
        {id:10, fill: 'rgb(249, 231, 159)', boader: 'rgb(82, 190, 128)', highlight: 'rgb(249, 231, 159,0.4)', text: "值",},
        {id:11, fill: 'rgb(171, 235, 198)', boader: 'rgb(69, 179, 157)', highlight: 'rgb(171, 235, 198,0.4)', text: "症状变化",},
        {id:12, fill: 'rgb(169, 223, 191)', boader: 'rgb(72, 201, 176)', highlight: 'rgb(169, 223, 191,0.4)', text: "未归类修饰词"},


    ];
    public selectable = false;

    private style = {
        padding: 10,
        baseLeft: 30,
        rectColor: '',
        width: 0,
        height: 0
    };
    private draw;
    
    constructor(container, width=500, height=500) {
        this.svg = (SVG as any)(container).size(width, height);
        this.style.width = width;
        this.style.height = height;
        this.group = {
            highlight: this.svg.group(),
            text: this.svg.group(),
            annotation: []
        };
        this.lines = {
            text: [],
            highlight: [],
            annotation: this.group['annotation'],
            raw: [],
            label: []
        };
        this.draw = new Draw(this);
        // Add Event Listener
        let that = this;
        this.selectable = true;
        if (this.selectable) {
            window.addEventListener('mouseup', () => { that.selectionEventHandler(); });
        }
    }

    public import(raw:String, labels) {
        this.clear();
        let slices = raw.split(/(.*?[\n\r。])/g);
        let lines = [];
        for (let slice of slices) {
            if (slice.length < 1) continue;
            lines.push(slice);
            this.lines['raw'].push(slice);
        }
        let baseTop = this.style.height = 0;
        let baseLeft = this.style.baseLeft;
        let maxWidth = 0;
        let that = this;
        for (let label of labels) {
            try {
                let {x, y, no} = this.posInLine(label['pos'][0], label['pos'][1]);
                if (!this.lines['label'][no - 1]) this.lines['label'][no - 1] = [];
                this.lines['label'][no - 1].push({x, y, category: label['category']});
            } catch (e) {
                if (e instanceof InvalidLabelError) {
                    console.error(e.message);
                    continue;
                }
                throw e;
            }
        }

        let drawAsync = (startAt) => {
            that.requestAnimeFrame(() => {
                let endAt = startAt + 50 > lines.length ? lines.length : startAt + 50;
                if (startAt >= lines.length) return;
                for (let i = startAt; i < endAt; i++) {
                    // Render texts
                    baseTop = this.style.height;
                    let text = that.draw.textline(i+1, lines[i], baseLeft, baseTop);
                    let width = text.node.clientWidth + baseLeft;
                    if (width > maxWidth) maxWidth = width;
                    that.lines['text'].push(text);
                    that.lines['annotation'].push([]);
                    that.lines['highlight'].push([]);
                    baseTop += that.style.padding + text.node.clientHeight;
                    that.style.height = baseTop;
                    // Render annotation labels
                    if (that.lines['label'][i]) {
                        for (let label of that.lines['label'][i]) {
                            let startAt = that.lines['text'][i].node.getExtentOfChar(label.x);
                            let endAt = that.lines['text'][i].node.getExtentOfChar(label.y);
                            let selector = {
                                lineNo: i+1,
                                width: endAt.x - startAt.x + endAt.width,
                                height: startAt.height,
                                left: startAt.x,
                                top: startAt.y
                            };
                            //that.draw.label(labels[i].category, selector);
                            that.draw.label(label.category, selector);
                        }
                    }
                }
                that.style.width = maxWidth + 100;
                that.svg.size(maxWidth + 100, that.style.height);
                drawAsync(endAt);
            });
        };
        drawAsync(0);
    }

    public stringify() {

    }

    private selectionEventHandler() {
        try {
            let selector = TextSelector.rect();
            selector['lineNo'] = TextSelector.lineNo();
            this.draw.label(2, selector);
        } catch (e) {
            if (e instanceof SelectorDummyException) {
                console.error(e.message);
                return;
            }
            throw e;
        }
    }

    private clone(src) {
        return JSON.parse(JSON.stringify(src));
    }

    private posInLine(x,y) {
        let lineNo = 0;
        for (let raw of this.lines['raw']) {
            lineNo += 1;
            if (x - raw.length < 0) break;
            x -= raw.length;
        }
        for (let raw of this.lines['raw']) {
            if (y - raw.length < 0) break;
            y -= raw.length;
        }
        if (x > y) throw new InvalidLabelError(`Invalid selection, x:${x}, y:${y}, line no: ${lineNo}`);
        return {x,y,no: lineNo};
    }

    private clear() {
        this.svg.clear();
        this.group = {
            highlight: this.svg.group(),
            text: this.svg.group(),
            annotation: []
        };
        this.lines = {
            text: [],
            highlight: [],
            annotation: this.group['annotation'],
            raw: [],
            label: []
        };
    }

    private requestAnimeFrame(callback) {
        if (window.requestAnimationFrame)
            window.requestAnimationFrame(callback);
        else
            setTimeout(callback, 16);
    }
}

class InvalidLabelError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
    }
}