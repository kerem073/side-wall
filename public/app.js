import PaletteManager from './palette.js';
import CanvasManager from './canvasmanager.js';

let socket = new WebSocket("ws://localhost:3000/point"); // TODO: remove localhost

// Setting up stroke weight 
let strokeSliderElement = document.getElementById("strokeSlider");
let strokeWeight = parseInt(strokeSliderElement.value);
strokeSliderElement.addEventListener("input", (event) => {
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

socket.addEventListener("message", (event) => {
    ReadMessage(event.data);
});

const paletteElement = document.getElementById("UI");
const canvasElement = document.getElementById("canvas");
const canvasContext = canvasElement.getContext("2d");

const paletteManager = new PaletteManager();
const canvasManager = new CanvasManager();

document.addEventListener("mousedown", (event) => {
    const target = event.target;
    if(target.isEqualNode(paletteElement)){
        paletteManager.eventStart();
        // No need for event.stopPropagation();
    }

    if(target.isEqualNode(canvasElement)){
        canvasManager.beginLine(event.pageX, event.pageY, strokeColor, strokeWeight);
        // No need for event.stopPropagation();
    }

    if (target.isEqualNode(strokeSliderElement)){

        event.stopPropagation();
    }

});

document.addEventListener("mousemove", (event) => {
    const target = event.target;
    if(target.isEqualNode(paletteElement)){
        paletteManager.eventMove();
        // No need for event.stopPropagation();
    }

    if(target.isEqualNode(canvasElement)){
        canvasManager.addPoint(event.pageX, event.pageX, false);
        // No need for event.stopPropagation();
    }

    if (target.isEqualNode(strokeSliderElement)){
        event.stopPropagation();
    }
});

document.addEventListener("mouseup", (event) => {
    const target = event.target;
    if(target.isEqualNode(paletteElement)){
        paletteManager.eventEnd();
        // No need for event.stopPropagation();
    }

    if(target.isEqualNode(canvasElement)){
        canvasManager.addPoint(event.pageX, event.pageX, true);
        // No need for event.stopPropagation();
    }

    if (target.isEqualNode(strokeSliderElement)){
        event.stopPropagation();
    }
});

document.addEventListener("touchstart", (event) => {});
document.addEventListener("touchmove", (event) => {});
document.addEventListener("touchend", (event) => {});
