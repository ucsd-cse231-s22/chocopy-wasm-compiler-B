import { Type, Value } from "./ast";
import { ObjectField } from "./repl";
import { PrintType } from "./utils";

function stringify(typ: PrintType, arg: any, mem?: WebAssembly.Memory, typeNum?: number) : string {
  switch(PrintType[typ]) {
    case "number":
      return (arg as number).toString();
    case "bool":
      return (arg as boolean)? "True" : "False";
    case "none":
      return "None";
    // case "class":
    //   return typ.name;
    // case "set":
    //   return "Set";
    // case "dict":
    //   return "Dict";
    // case "str":
    //   return (arg as string);
    case "list":
      var bytes = new Uint8Array(mem.buffer, arg, 4);
      var length = ((bytes[0] & 0xFF) | (bytes[1] & 0xFF) << 8 | (bytes[2] & 0xFF) << 16 | (bytes[3] & 0xFF) << 24);
      bytes = new Uint8Array(mem.buffer, arg + 4, 4);
      var address = ((bytes[0] & 0xFF) | (bytes[1] & 0xFF) << 8 | (bytes[2] & 0xFF) << 16 | (bytes[3] & 0xFF) << 24);
      var elementArray = new Int32Array(mem.buffer, address, length);
      var string = "[";
      for (let i = 0; i < length; i++) {
        if (typeNum > PrintType.list) {
          string += stringify(typ, elementArray[i], mem, typeNum - PrintType.list);
        }
        else {
          string += stringify(typeNum, elementArray[i], mem);
        }
        if (i < length - 1) {
          string += ", ";
        }
      }
      string += "]";
      return string;
  }
}

//ref: https://www.w3schools.com/howto/howto_js_accordion.asp
function initialAccordionEvent() {
  var acc = document.getElementsByClassName("accordion");
  var i = 0;
  for (i; i < acc.length; i++) {
    if (acc[i].getAttribute("listener") !== "true") {
      acc[i].setAttribute("listener", "true");
      acc[i].addEventListener("click", function () {
        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        var arrow = this.firstChild;
        if (panel.style.display === "block") {
          panel.style.display = "none";
          arrow.style.transform = "rotate(-45deg)";
        } else {
          panel.style.display = "block";
          arrow.style.transform = "rotate(45deg)";
        }
      });
    }
  }
}

function renderConstField(key: string, value: Value, elt: HTMLElement){
  switch(value.tag){
    case "none":
      break;
    case "num":
      elt.innerHTML = "<b class='tag'>" + key + ": </b><p class='val'>" + String(value.value) + "</p>";
      break;
    case "bool":
      elt.innerHTML = "<b class='tag'>" + key + ": </b><p class='val'>" + (value.value) ? "True" : "False" + "</p>";
      break;
    default:
      throw new Error(`This is not a const field: ${value}`);
  }
}

function renderClassObject(result: Value, objectTrackList: Array<ObjectField>, elt: HTMLElement){
  if (result.tag != "object"){
    throw new Error(`Could not render non-object in this function: ${result}`);
  } 
  const accordEle = document.createElement("button") as HTMLButtonElement;
  accordEle.setAttribute("class", "accordion");
  accordEle.innerHTML = "<i class='arrow' id='arrow'></i>  " + result.name + " object";
  const addr = document.createElement("p");
  addr.innerHTML = "<b class='tag'>address: </b><p class='val'>" + result.address + "</p>";
  addr.setAttribute("class", "info");
  const panEle = document.createElement("div");
  panEle.setAttribute("class", "panel");
  panEle.appendChild(addr);

  objectTrackList.forEach((field) => {
    const fele = document.createElement("pre");
    switch (field.tag) {
      case "object":
        fele.innerHTML = "<b class='tag'>" + field.fieldName + ": </b>";
        if (field.objectTrackList.length === 0) {
          fele.innerHTML += "<p class='val'>none</p>";
        } else {
          const objEle = document.createElement("pre"); //pre or div?
          fele.appendChild(objEle);
          renderClassObject(field.value, field.objectTrackList, objEle);
        }
        break;
      default:
        renderConstField(field.fieldName, field.value, fele);
        break;
    }
    panEle.appendChild(fele);
    fele.setAttribute("class", "info");
  });
  elt.appendChild(accordEle); //append accord
  elt.appendChild(panEle); // append panel
}

function renderObject(result: Value, objectTrackList: Array<ObjectField>, elt: HTMLElement){
  switch (result.tag){
    case "object":
      renderClassObject(result, objectTrackList, elt);
      break;
    default:
      throw new Error(`Could not render object: ${result}`);
  }
}

function renderNewLine(result: Value, elt: HTMLElement){
  switch (result.tag) {
    case "none":
      break;
    case "num":
      elt.innerText = String(result.value);
      break;
    case "bool":
      elt.innerHTML = (result.value) ? "True" : "False";
      break;
    case "object":
      elt.innerHTML = `Object: ${result.name}`
      break
    default: 
      throw new Error(`Could not render value: ${result}`);
  }
}

export function renderResult(result : Value, objectTrackList: Array<ObjectField>) : void {
  if(result === undefined) { return; }
  const elt = document.createElement("pre");
  document.getElementById("output").appendChild(elt);
  renderNewLine(result, elt);
  if (objectTrackList.length!=0){
    const objEle = document.createElement("pre");
    document.getElementById("output").appendChild(objEle);
    renderObject(result, objectTrackList, objEle); // if you not change it will be in the same box
    initialAccordionEvent();
  }
}

export function renderPrint(typ: PrintType, arg : number, mem?: WebAssembly.Memory, typeNum?: number) : any {
  // console.log("Logging from WASM: ", arg);
  const elt = document.createElement("pre");
  document.getElementById("output").appendChild(elt);
  elt.innerText = stringify(typ, arg, mem, typeNum);
  return arg;
}

export function renderError(result : any) : void {
  const elt = document.createElement("pre");
  document.getElementById("output").appendChild(elt);
  elt.setAttribute("style", "color: red");
  elt.innerText = String(result);
}
