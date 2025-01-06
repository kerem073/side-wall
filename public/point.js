export class Point {
    x = 0;
    y = 0;
    order_number = 0; // order of the point in the line
    line_id = 0; // the id of the line that the point
    datetime = 0;
    line_end = 0;

    constructor(newx, newy, lid, order) {
        this.x = newx;
        this.y = newy;
        this.order_number = order;
        this.line_id = lid;

        let datetime = new Date();
        let formattedDate = datetime.toISOString().slice(0, 19).replace('T', ' ');
        this.datetime = formattedDate;
    }
}
