let clickedElementList = [];

function list_visible() {
    let div = document.getElementById("KT_1_list");
    div.style.display = div.style.display == "none" ? "block" : "none";
}

function list_change(id) {
  let clickedElement = document.getElementById(id + '_label').innerText;
  let button = document.getElementById('KT_1_button');
  let elementExists = false;
  clickedElementList.forEach(element => {
    if(element === clickedElement){
      clickedElementList.splice (clickedElementList.indexOf('clickedElement'), 1);
      elementExists = true;
    }
  });
  if(!elementExists){
    clickedElementList.push(clickedElement)
  }
  if(clickedElementList.length === 0){
    button.value = ' Branche';
  }
  else{
    let count = 1;
    button.value = null;
    clickedElementList.forEach(element => {
      button.value += element;
      if(count < clickedElementList.length){
        button.value += ',';
        count++;
      }
    });
  }
}

function more_options() {
    let div = document.getElementById("more_options_div");
    div.style.display = div.style.display == "none" ? "block" : "none";
}
if (document.getElementById('KT_1_1')) {
	document.getElementById('KT_1_1').onchange = function() {
		console.log(this);
    }
}
function setInputFilter(textbox, inputFilter) {
    ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function(event) {
      textbox.addEventListener(event, function() {
        if (inputFilter(this.value)) {
          this.oldValue = this.value;
          this.oldSelectionStart = this.selectionStart;
          this.oldSelectionEnd = this.selectionEnd;
        } else if (this.hasOwnProperty("oldValue")) {
          this.value = this.oldValue;
          this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
        } else {
          this.value = "";
        }
      });
    });
  }
  // do things after the DOM loads fully
  window.addEventListener("load", function () {
    console.log("Everything is loaded");
    setInputFilter(document.getElementById("radVal"), function(value) {
      return /^\d*$/.test(value); });
  });