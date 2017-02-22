/**
 * CONTROLADOR PARA LA CONVERSACION CON WATSON
 */


VodafoneTVApp
.run(['$anchorScroll', function($anchorScroll) {
    $anchorScroll.yOffset = 50;
}])
.controller('ChatController', ['$scope', '$http', '$location', '$anchorScroll', 'serviceData', '$rootScope', '$window',
    function ChatController($scope, $http, $location, $anchorScroll, serviceData, $rootScope, $window) {

        console.log("INICIANDO CHAT CONTROLLER ... ");
        console.log("Iniciando Conversacion ... ");
        
        var hostServer = serviceData.getWasonServer();
        
        
        var entities = {}
        var wContext = {};
        var rowId = 0;

        // Responses types
        var WATSON_RESPONSE = {
            FILMS: 0,
            MUSIC: 1,
            SERIES: 2
            // Replace number with identifiers
        };

        function Response() {
            this.id = 0;
            this.type = WATSON_RESPONSE.FILMS;
            this.items = [];
            this.text = "";
        }

        function addChatRow(watson, text) {
            var div = document.createElement('div');
            $(div).attr("id","chatRow" + rowId++);
            div.className = watson == true ? 'chat-bubble-watson alert alert-success' : 'chat-bubble-me alert alert-info';
            div.innerHTML = text;
            document.getElementById('conversation_container').appendChild(div);

            console.log("Saltando a :: "+ 'chatRow'+(rowId-1));

            $location.hash('chatRow'+(rowId-1));
            $anchorScroll();
        }

        function receiveResponse(success, error, response) {
            if (success) {
                // Actions when response is correct ...
                //updateChatLog("Watson",response.text);
                addChatRow(true, response.text);
                console.log("CONTEXTO RECIBIDO WATSON :: ", response.items);
                analyzeContext(response.items);
                
            } else {
                // Actions when response is KO ...
                //updateChatLog("Error",error);
            }
        }

        function checkTimeMessage(context, text){
            var defered = $q.defer();
            var promise = defered.promise; 
            var filterTime = (context.tiempo !== undefined ? context.tiempo : "");
            var filterTimeZone = (context.mitimezone !== undefined ? context.mitimezone : "");
            if (filterTime.split(':').lenght > 0){
                text = text.substring(0, text.indexOf(filterTime));
                defered.resolve(text + serviceData.translateTime(filterTime, filterTimeZone));
            }else{
                defered.resolve(text);
            }
            return promise;
        }


        $scope.sendMessage = function() {

            //var text = document.getElementById("inputMessage").value;    
            var text = $scope.inputMessage;
            console.log("inputMessage :: ", text);
            
            text = (text === undefined) ? "" : text;
            if (text.length > 0)
                addChatRow(false, text);

            //updateChatLog("You", text);
            var payload = {};
            if (text) { payload.input = { "text": text }; };
            if (wContext) { payload.context = wContext; };

            
            $.ajax({
                url: hostServer+"/api/message",
                //url: "https://vodatv.mybluemix.net/api/message",
                type: "POST",
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(payload),
                success: function (response) {
                    //var json = JSON.parse(xhr.responseText);
                    console.log("RESPONSE WATSON ::", response);
                    wContext = response.context;
                    entities = (response.entities !== undefined)? response.entities : undefined;
                    // Parse response in new Object with more data -------------
                    var result = new Response();
                    result.id = "Identifier";
                    //result.items = response.context.context;
                    result.items = response.context;                    
                    //result.text = response.output.text;
                    result.text = response.output.text.length > 0 ? response.output.text : "Lo siento, no te he entendido";
                    // ---------------------------------------------------------
                    receiveResponse(true, null, result);
                },
                error: function (xhr, textStatus, error) {
                    console.log(xhr.statusText);
                    var result = new Response();
                    result.id = "Identifier";
                    //result.items = response.context.context;
                    result.items = [];
                    
                    result.text = "Lo sentimos, se ha producido un problema de comunicaci&oacute;n con el servicio"
                    receiveResponse(true, null, result);
                    //receiveResponse(false, JSON.stringify(xhr), null);
                }
            });
            document.getElementById("inputMessage").value = "";
        }

        amplify.subscribe("sendMessageTime", function(data){
            $scope.inputMessage = "";
            console.log("Contexto inicial :: ", wContext);
            wContext.categoria = data.categoria;
            wContext.contenido_previsualizar = data.contenido_previsualizar;
            delete wContext.tiempo;
            console.log("Enviando Mensaje con contexto :: ", wContext);
            //$scope.sendMessage();
            analyzeContext(wContext);
        });

        $scope.send = function ($event) {
            var keyCode = $event.which || $event.keyCode;
            
            if (keyCode === 13) {
                $scope.sendMessage();
            }
        }


        var clearContext = function() {
            console.log("LIMPIAMOS EL CONTEXTO WATSON" , wContext);
            //wContext.contenido_previsualizar = [];
            //if (wContext.categoria) wContext.categoria = "";
            if (wContext.seasonID) wContext.seasonID = "";
            if (wContext.itemID) wContext.itemID = "";
            if (wContext.serieINF) wContext.serieINF = ""
            wContext.layer = "miCapa";
            console.log("VACIADO ... " , wContext);
        }
        

        $scope.displayTranscript = function (){
            console.log($rootScope.transcript);
            $scope.inputMessage = $rootScope.transcript;
            $scope.sendMessage();
            $scope.inputMessage = "";
        }

        $scope.sendMessage();
        serviceData.updateCurrentLayer(serviceData.getNavigationLayers.main);

        var analyzeContext = function (context) {
            if (context.contenido_previsualizar !== undefined && context.categoria !== undefined) {
                console.log("OBTENIENDO LOS ELEMENTOS ", context.contenido_previsualizar, " DE LA CATEGORIA ", context.categoria);

                var filterParams = {
                    categoria:context.categoria, 
                    contenido_previsualizar : context.contenido_previsualizar,
                    filterName: (context.serieINF !== undefined ? context.serieINF : ""),
                    filterId: (context.itemID !== undefined ? context.itemID : ""),
                    filterSeason: (context.seasonID !== undefined ? context.seasonID : ""),
                    //filterChapter: ( (entities[0].entity === "sys-number" && context.elegido === "sys-number") ?  entities[0].value : ""),
                    filterChapter: ( context.elegido !== undefined ?  context.elegido : ""),
                    filterVideo: (context.estado_video !== undefined ? context.estado_video : ""),
                    filterTime: (context.tiempo !== undefined ? context.tiempo : ""),
                    filterTimeZone: (context.mitimezone !== undefined ? context.mitimezone : "")
                }

                console.log("APLICANDO FILTRO :: ", filterParams);

                var statusplayer = {
                    play : "arrancado",
                    pause : "pasusa",
                    stop : "exit"
                }

                if (context.categoria !== undefined){
                    var dataContext = serviceData.translateWatsonList(filterParams);
                    dataContext.then(function(dataContext){
                            console.log("################################################################################");
                            console.log("######  Tratando elementos en la capa :: ", serviceData.getCurrentLayer() , "###");
                            console.log("################################################################################");
                            //if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers.main && context.serieINF === ""){
                            if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().main ){
                                console.log("ENTRANDO POR CAPA MAIN ::", dataContext, context.categoria);
                                console.log("DISPARANDO loadInitialContent");
                                amplify.publish("loadInitialContent", {context : dataContext, contentType: context.categoria});
                                //wContext.contenido_previsualizar = [];
                                //wContext.categoria = "";
                                
                                console.log("VACIANDO CONTEXTO ... " , wContext);
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().chapterList && filterParams.filterSeason !== ""){
                                console.log("ENTRANDO POR CAPA CHAPTERLIST");
                                console.log("DISPARANDO goToSeason");
                                amplify.publish("goToSeason", { season: filterParams.filterSeason });
                                wContext.itemID = "";
                                wContext.serieINF = "";
                                wContext.contenido_previsualizar = [];
                                //wContext.categoria = "";
                                //wContext.seasonID = "";
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().list && context.serieINF !== ""){
                                console.log("ENTRANDO POR CAPA - SEASON LIST", dataContext);                        
                                console.log("DISPARANDO loadSeasonList");
                                amplify.publish("loadSeasonList", {elemId: dataContext, defaultSeason: context.contenido_previsualizar, contentType: context.categoria});
                                wContext.itemID = "";
                                wContext.serieINF = "";
                                wContext.contenido_previsualizar = [];
                                //wContext.categoria = "";
                                /*if (filterParams.filterSeason !== ""){
                                    amplify.publish("goToSeason", { season: filterParams.filterSeason });
                                }else{
                                    amplify.publish("loadSeasonList", {elemId: dataContext, defaultSeason: context.contenido_previsualizar});
                                }*/
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().content &&  filterParams.filterChapter !== "" && context.elegido !=="" ){
                                console.log("ENTRANDO POR CAPA - DETALLE");
                                console.log("Disparando loadChapterDetail", "Temporada", filterParams.filterSeason, "Capitulo", filterParams.filterChapter );
                                amplify.publish("loadChapterDetail", {itemId: filterParams.filterChapter, seasonId: filterParams.filterSeason, elemId: dataContext});    
                                wContext.itemID = "";
                                wContext.serieINF = "";
                                wContext.contenido_previsualizar = [];
                                //wContext.categoria = "";
                                wContext.seasonID = ""; 
                                wContext.elegido = "";  
                                wContext.temporada = "";                   
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().player) {
                                if (filterParams.filterVideo === "arrancado"){
                                    console.log("Iniciando reproducción");
                                    amplify.publish("updatePlayer",{order : "play"});
                                } else if (filterParams.filterVideo === statusplayer.pause) {
                                    amplify.publish("updatePlayer",{order : "pause"});
                                } else if (filterParams.filterVideo === statusplayer.stop) {
                                    amplify.publish("updatePlayer",{order : "stop"});
                                    if (wContext.elegido) wContext.elegido = "";
                                    if (wContext.estado) wContext.estado = "";
                                    if (wContext.estado_video) wContext = "";
                                }
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().default){
                                amplify.publish("loadDefaultLayer");
                            }

                            
                            //clearContext();
                    });

                }                                
            }
             
        }

        

        $scope.checkSpeech = function () {
            /*try {
                if (webkitSpeechRecognition)
                    return true;
                else
                    return false;
            } catch (e){
                return false;
            }*/
           return true;
        }




        

    }
]);
