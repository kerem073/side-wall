export class PointMessage {
    x = 0;
    y = 0;
    order_number = 0;
    line_id = 0;
    line_color = 0;
    line_thickness = 0;
    datetime = 0;
}

export function ReadMessage(data){
    let lines = [];
    let point = JSON.parse(data);
    let notInDrawingLines = false;

    if (lines.length == 0){
        let l = new Line(point.line_color, point.line_thickness);
        l.line_id = point.line_id;
        lines.push(l);
    }

    for (let i = 0; i < lines.length; i++){
        if (point.line_id == lines[i].line_id){
            lines[i].drawPoint(point, canvasContext);
            break;
        }
        if ((lines.length - 1) == i){
            notInDrawingLines = true;
        }
    }
    
    if (notInDrawingLines){
        let l = new Line(point.line_color, point.line_thickness);
        l.line_id = point.line_id;
        lines.push(l);
    }

    if (point.line_end == 1){
        let indexToRemove;
        for (let i = 0; i < lines.length; i++){
            if (point.line_id == lines[i].line_id){
                indexToRemove = i;
                break;
            }
        }
        lines.splice(indexToRemove, 1);
    }
}
