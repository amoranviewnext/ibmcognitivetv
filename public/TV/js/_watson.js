

// Responses types
var WATSON_RESPONSE = {
  FILMS : 0, 
  MUSIC: 1, 
  SERIES : 2

  // Replace number with identifiers

};

function Response(){

	this.id = 0;
	this.type = WATSON_RESPONSE.FILMS;
	this.items = [];
	this.text = "";

}


// GENERIC RESPONSE
$(document).ready(function(){
	init();
});


var context = {};
function updateChatLog(user, message) {

	if (message) {

    	var div = document.createElement("div");
        div.innerHTML = "<b>" + user + "</b>: " + message;
    	document.getElementById("history").appendChild(div);
        document.getElementById("text").value = "";

    }

}

function receiveResponse(success, error, response) {

	if (success) {

		// Actions when response is correct ...
		//updateChatLog("Watson",response.text);
        addChatRow(true, response.text);

	} else {

		// Actions when response is KO ...
		//updateChatLog("Error",error);

	}


}

function sendMessage() {

    var text = document.getElementById("inputMessage").value;    
    if (text.length > 0) addChatRow(false, text);

    //updateChatLog("You", text);
    var payload = {};
	if (text) {payload.input = { "text": text }; };
    if (context) {payload.context = context; };

    $.ajax({
    	url: "http://localhost:3000/api/message",
        type: "POST",
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(payload),
        success: function ( response ){
                            //var json = JSON.parse(xhr.responseText);
			console.log("RESPONSE ", JSON.stringify(response));
            context = response.context;

            // Parse response in new Object with more data -------------
            var result = new Response();
            result.id = "Identifier";
            result.items = response.context.context;
            result.text = response.output.text;
            // ---------------------------------------------------------

            receiveResponse(true,null, result);

        },
        error: function(xhr, textStatus, error){
            
            console.log(xhr.statusText);
            receiveResponse(false,JSON.stringify(xhr), null);

            }

    });

    document.getElementById("inputMessage").value = "";


}

function init() {

	document.getElementById("inputMessage").addEventListener("keydown", function (e) {
    	if (!e) { var e = window.event; }
        if (e.keyCode == 13) { sendMessage(); }
    }, false);
    
    sendMessage();

 }


 function addChatRow(watson , text ) {
    
    var div = document.createElement('div');
    div.className = watson == true ? 'chat-bubble alert alert-success' :  'chat-bubble alert alert-info';
    div.innerHTML = text;

    document.getElementById('conversation_container').appendChild(div);
    
}