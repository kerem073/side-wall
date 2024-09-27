import { Point, Line, CanvasManager } from './canvas.js'
import { socketInit } from './socket.js';
import { UIPalette } from './UIPalette.js';

const socket = socketInit();

//  TODO: get other peoples strokes
//  TODO: get the canvas from the database
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

// TODO: TOUCH EVENTS
// For touch events, the passive boolean needs to be false. This will enable event.preventDefault(). Because it does need to wait if event.Default is called.


