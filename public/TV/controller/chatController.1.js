/**
 * CONTROLADOR PARA LA CONVERSACION CON WATSON
 */


VodafoneTVApp
.run(['$anchorScroll', function($anchorScroll) {
    $anchorScroll.yOffset = 50;
}])
.controller('ChatController', ['$scope', '$http', '$location', '$anchorScroll', 'serviceData',
    function ChatController($scope, $http, $location, $anchorScroll, serviceData) {

        console.log("INICIANDO CHAT CONTROLLER ... ");
        console.log("Iniciando Conversacion ... ");
        
        var hostServer = serviceData.getWasonServer();
        
        
        var entities = {}
        var context = {};
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
                console.log("CONTEXTO :: ", response.items);
                analyzeContext(response.items);
            } else {
                // Actions when response is KO ...
                //updateChatLog("Error",error);
            }
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
            if (context) { payload.context = context; };

            
            $.ajax({
                url: hostServer+"/api/message",
                //url: "https://vodatv.mybluemix.net/api/message",
                type: "POST",
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(payload),
                success: function (response) {
                    //var json = JSON.parse(xhr.responseText);
                    console.log("RESPONSE ", JSON.stringify(response));
                    context = response.context;
                    entities = (response.entities !== undefined)? response.entities : undefined;
                    // Parse response in new Object with more data -------------
                    var result = new Response();
                    result.id = "Identifier";
                    //result.items = response.context.context;
                    result.items = response.context;
                    result.text = response.output.text;
                    // ---------------------------------------------------------
                    receiveResponse(true, null, result);
                },
                error: function (xhr, textStatus, error) {
                    console.log(xhr.statusText);
                    receiveResponse(false, JSON.stringify(xhr), null);
                }
            });
            document.getElementById("inputMessage").value = "";
        }

        $scope.send = function ($event) {
            var keyCode = $event.which || $event.keyCode;
            if (keyCode === 13) {
                $scope.sendMessage();
            }
        }
        


        $scope.sendMessage();
        serviceData.updateCurrentLayer(serviceData.getNavigationLayers.main);

        var analyzeContext = function (context) {
            if (context.contenido_previsualizar !== undefined && context.categoria !== "") {
                console.log("OBTENIENDO LOS ELEMENTOS ", context.contenido_previsualizar, " DE LA CATEGORIA ", context.categoria);

                var filterParams = {
                    filterName: (context.serieINF !== undefined ? context.serieINF : ""),
                    filterId: (context.itemID !== undefined ? context.itemID : ""),
                    filterSeason: (context.seasonID !== undefined ? context.seasonID : ""),
                    filterChapter: ( (entities[0].entity === "sys-number" && context.elegido === "sys-number") ?  entities[0].value : ""),
                    filterVideo: (context.estado_video !== undefined ? context.estado_video : "")
                }

                console.log("APLICANDO FILTRO :: ", filterParams);

                var statusplayer = {
                    play : "arrancado",
                    pause : "pasusa",
                    stop : "exit"
                }

                if (context.categoria !== undefined){
                    var dataContext = serviceData.translateWatsonList(context.categoria, context.contenido_previsualizar, filterParams);
                    dataContext.then(function(dataContext){
                            console.log("Tratando elementos en la capa :: ", serviceData.getCurrentLayer());
                            //if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers.main && context.serieINF === ""){
                            if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().main ){
                                console.log("ENTRANDO POR CAPA MAIN ::", dataContext, context.categoria);
                                console.log("DISPARANDO loadInitialContent");
                                amplify.publish("loadInitialContent", {context : dataContext, contentType: context.categoria});
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().chapterlist && filterParams.filterSeason !== ""){
                                console.log("ENTRANDO POR CAPA CHAPTERLIST");
                                console.log("DISPARANDO goToSeason");
                                amplify.publish("goToSeason", { season: filterParams.filterSeason });
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().list && context.serieINF !== ""){
                                console.log("ENTRANDO POR CAPA - SEASON LIST", dataContext);                        
                                console.log("DISPARANDO loadSeasonList");
                                amplify.publish("loadSeasonList", {elemId: dataContext, defaultSeason: context.contenido_previsualizar});
                                
                                /*if (filterParams.filterSeason !== ""){
                                    amplify.publish("goToSeason", { season: filterParams.filterSeason });
                                }else{
                                    amplify.publish("loadSeasonList", {elemId: dataContext, defaultSeason: context.contenido_previsualizar});
                                }*/
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().content && context.chapterID !== "" && context.elegido ==="sys-number" ){
                                console.log("ENTRANDO POR CAPA - DETALLE");
                                console.log("Disparando loadChapterDetail", "Temporada", filterParams.filterSeason, "Capitulo", filterParams.filterChapter );
                                amplify.publish("loadChapterDetail", {itemId: filterParams.filterChapter, seasonId: filterParams.filterSeason});                                
                            } else if (serviceData.getCurrentLayer() === serviceData.getNavigationLayers().player) {
                                if (filterParams.filterVideo === "arrancado"){
                                    console.log("Iniciando reproducción");
                                    amplify.publish("updatePlayer",{order : "play"});
                                } else if (filterParams.filterVideo === statusplayer.pause) {
                                    amplify.publish("updatePlayer",{order : "pause"});
                                } else if (filterParams.filterVideo === statusplayer.stop) {
                                    amplify.publish("updatePlayer",{order : "stop"});
                                }
                            }

                            console.log("LIMPIAMOS EL CONTEXTO WATSON" , this.context);
                    });

                }                                
            }
             
        }

    }
]);
