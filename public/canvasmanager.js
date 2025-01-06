
export class CanvasManager {
    canvasContext = 0;
    points_pool = [];
    curLine = 0;

    constructor(canvasContext) {
        this.canvasContext = canvasContext;
    }

    beginLine(color, thickness) {
        this.curLine = new Line(color, thickness);
        this.addPoint(x, y, false); // TODO: break addPoint smaller?
    }

    addPoint(x, y, isEnd) {
        this.curLine.addPoint(x, y, this.canvasContext);
        let latest_point = this.curLine.latest_point;
        let msg = new PointMessage();

        msg.x = x;
        msg.y = y;
        msg.order_number = latest_point.order_number;
        msg.line_id = latest_point.line_id;
        msg.datetime = latest_point.datetime;
        msg.line_color = this.curLine.line_color;
        msg.line_thickness = this.curLine.line_thickness;
        msg.line_end = isEnd ? 1 : 0;

        this.points_pool.push(msg);
    }


    drawWholeCanvas() {

    }


    sendPoints(socket) {
        for (let i = 0; i < this.points_pool.length; i++) {
            console.log("sending: " + JSON.stringify(this.points_pool[i]));
            socket.send(JSON.stringify(this.points_pool[i]));
        }
        this.points_pool = [];
    }

    receivePoints(socket) {


    }

}
