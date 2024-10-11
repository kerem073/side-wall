import { Point, Line, CanvasManager } from './canvas.js'
import { socketInit, getAllLines } from './socket.js';
import { UIPalette } from './UIPalette.js';

const socket = socketInit();

//  TODO: NU HEREEE get other peoples strokes
//
//  TODO: implement AUTH + physical qr code? samen met de wsc? >>> if the average differences between points is big in very short amount of time, they will get a warning and then removed.

const canvasElement = document.getElementById("canvas");
const canvasContext = canvasElement.getContext("2d");

let isDrawing = false;

let UIPaletteElement = document.getElementById("UI");

// Setting up stroke weight 
let strokeSlider = document.getElementById("strokeSlider");
let strokeWeight = parseInt(strokeSlider.value);
strokeSlider.addEventListener("input", (event) => {
    strokeWeight = parseInt(event.target.value);
});

// Setting up stroke color
let strokeColor = "#000";
let colorElements = document.getElementsByClassName('colorElement'); // get the color elements
for (let i = 0; i < colorElements.length; i++) {
    colorElements[i].style.backgroundColor = colorElements[i].dataset.color;

    colorElements[i].addEventListener('click', () => {
        strokeColor = colorElements[i].dataset.color;
        for (let j = 0; j < colorElements.length; j++) {
            colorElements[j].classList.remove('activeColorElement');
        }
        colorElements[i].classList.add('activeColorElement');
    });
}

let canvasManager = new CanvasManager();
const uiPalette = new UIPalette(UIPaletteElement);

// TODO: Can't draw where the UIPaletteElement is -> remove and add eventlistener of the UIelement when drawing and stop drawing
canvasElement.addEventListener("mousedown", (event) =>{
    isDrawing = true;
    canvasManager.beginLine(strokeColor, strokeWeight);
});

canvasElement.addEventListener("mousemove", (event) =>{
    if (event.target.isEqualNode(canvasElement) && isDrawing){
        canvasManager.addPoint(event.pageX, event.pageY, canvasContext);
        canvasManager.sendPoints(socket);
    }
    if (!uiPalette.UIdrag){
        event.stopPropagation()
    }
});

canvasElement.addEventListener("mouseup", (event) =>{
    isDrawing = false;
});


document.addEventListener("mousedown", (event) => {
    console.log("event mousedown on document works");
    if (!isDrawing && !event.target.isEqualNode(document.getElementById("strokeSlider"))){
        for (let element = event.target; !element.isEqualNode(document.body); element = element.parentNode){
            if (element.isEqualNode(UIPaletteElement)){
                uiPalette.eventStart();
                break;
            }
        }
    }
});

document.addEventListener("mousemove", (event) => {
    console.log("event mousemove on document works");
    uiPalette.eventMove(event.clientX, event.clientY);
});

document.addEventListener("mouseup", (event) => {
    console.log("event mouseup on document works");
    uiPalette.eventEnd();
});

async function getCanvasAndDraw(){
    const url = "/getcanvas";
    const response = await fetch(url);
    const data = await response.json();

    let drawingLines = [];
    let notInDrawingLines = false;
    for (let i = 0; i < await data.Points.length; i++){
        let point = await data.Points[i];

        if (drawingLines.length == 0){
            for (let j = 0; j < await data.Lines.length; j++){
                let data_line = data.Lines[j];
                if (point.line_id == data_line.id){
                    let line = new Line(data_line.color, data_line.thickness);
                    line.id = data_line.id;
                    drawingLines.push(line);
                }
            }
        }

        for (let j = 0; j < drawingLines.length; j++){
            let drawingLine = drawingLines[j];

            if (point.line_id == drawingLine.id){
                drawingLine.drawPoint(point, canvasContext);
                break;
            }

            if (j == drawingLines.length - 1){
                notInDrawingLines = true;
            }
        }

        if (notInDrawingLines){
            for (let j = 0; j < await data.Lines.length; j++){
                let data_line = data.Lines[j];
                if (point.line_id == data_line.id){
                    let line = new Line(data_line.color, data_line.thickness);
                    line.id = data_line.id;
                    drawingLines.push(line);
                }
            }
            notInDrawingLines = false;
        }

    }
}

getCanvasAndDraw();

// TODO: TOUCH EVENTS
// For touch events, the passive boolean needs to be false. This will enable event.preventDefault(). Because it does need to wait if event.Default is called.


