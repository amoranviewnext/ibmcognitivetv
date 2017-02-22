/**
 * CONTROLADOR PARA LA VISTA PRINCIPAL
 */

VodafoneTVApp.controller('VisualizerController', ['$scope', '$http', '$q', 'serviceData', '$sce',
    function VisualizerController($scope, $http, $q, serviceData, $sce) {

        console.log(" INICIANDO VISUALIZER CONTROLLER ");
        var listTemplates = {
            'carousel': 'templates/carouselView.html',
            'list': 'templates/listView.html',
            'detail': 'templates/contentDetail.html'
        }

        $scope.classSprite = {
            'cine': 'button-sprite',
            'series': 'button-sprite-disable',
            'deportes': 'button-sprite-disable',
            'documentales': 'button-sprite-disable',
            'infantil': 'button-sprite-disable',
            'musica': 'button-sprite-disable'
        }

        $scope.currentContentType;

        //Lista con todo el contenido ordenado por temporadas
        $scope.fullContentList;


        $scope.contentTemplate = 'templates/listView.html';
        //$scope.contentTemplate = 'templates/carouselView.html';
        $scope.listItem = [];

        $scope.itemDetail;
        $scope.player;

        /*$scope.listItem = [
            {
                title:'Capitan America vs. Iron Man',
                description:'Capitan America: Civil War',
                url:'https://tv.vodafone.es/wp-content/uploads/2016/08/captain-america-civil-war.jpg'
            },
            {
                title:'TITULO 2',
                description:'DESCRIPCION 2',
                url:'https://tv.vodafone.es/wp-content/uploads/2016/08/captain-america-civil-war.jpg'
            },
            {
                title:'TITULO 3',
                description:'DESCRIPCION 3',
                url:'https://tv.vodafone.es/wp-content/uploads/2016/08/captain-america-civil-war.jpg'
            }
        ];*/

        var dataContent = serviceData.callService("Cine",false);
        dataContent.then(function (dataContent) {
            //console.log("dataContent::",dataContent);        
            angular.forEach(dataContent, function (item, i) {
                //console.log (item);      
                $scope.listItem[i] = item;
            });
            $scope.currentContentType = "Cine";
        });

        $scope.getContentByType = function (contentType, filterList) {

            console.log("$scope.getContentByType ->", filterList);
            $scope.currentContentType = contentType;

            //CARGAMOS LA PLANTILLA PARA VISUALIZAR LISTA
            if ($scope.contentTemplate !== listTemplates.list) {
                $scope.contentTemplate = listTemplates.list;
            }
            
            var dataContent = serviceData.callService(contentType, filterList);
            $scope.listItem.length = 0;
            $scope.listItem = [];
            dataContent.then(function (dataContent) {
                //console.log("dataContent::",dataContent);       

                angular.forEach($scope.classSprite, function(item, i){
                    console.log(item, i);
                    
                    if (i === contentType.toLowerCase()){
                        $scope.classSprite[i] = 'button-sprite';
                        //item = 'button-sprite';
                    }else{
                        $scope.classSprite[i] = 'button-sprite-disable';
                        //item = 'button-sprite-disable';
                    }
                });

                
                console.log(dataContent);
                angular.forEach(dataContent, function (item, i) {
                    console.log (item, i);      
                    $scope.listItem[i] = item;

                    

                    /*if ($scope.classSprite === "button-sprite-disable") {
                        console.log(contentType + "CLASE :: ", $scope.classSprite);
                        $scope.classSprite = "";
                        $scope.classSprite = "button-sprite";
                        console.log(contentType + "CAMBIANDO A :: ", $scope.classSprite);
                    } else {
                        console.log(contentType + "CLASE :: ", $scope.classSprite);
                        $scope.classSprite = "";
                        $scope.classSprite = "button-sprite-disable";
                        console.log(contentType + "CAMBIANDO A :: ", $scope.classSprite);
                    }*/
                });
            });
        }

        $scope.selectedItemClick = function (index, season) {
            // CARGAMOS LOS DATOS DEL ELEMENTO SELECCIONADO
            console.log("Elemento seleccionado :: " + index);
            $scope.itemDetail = $scope.listItem[index];
            
            if ($scope.currentContentType.toLowerCase() === 'cine'){
                // CARGAMOS LA PLANTILLA "CONTENTDETAIL" PARA VISUALIZAR EL ELEMENTO
                $scope.contentTemplate = 'templates/contentDetail.html';
            } else {
                var seasonList = serviceData.getSeasonList($scope.itemDetail.id, $scope.currentContentType);
                seasonList.then(function (seasonList) {                
                    if (seasonList.total_seasons > 0 && seasonList.seasons !== undefined){
                        var fullList = [];
                        var deferred = $q.defer();
                        console.log("TEMPORADAS DISPONIBLES :: [" + seasonList.total_seasons + "] // LISTADO :: [" +seasonList.seasons +"]");
                        angular.forEach(seasonList.seasons, function(season, idx){
                            console.log("OBTENIENDO CONTENIDO PARA LA TEMPORADA [" + season +"] del item [" + $scope.itemDetail.id + "]");
                            var contentList = serviceData.getContentList($scope.itemDetail.id, season ,$scope.currentContentType);
                            contentList.then(function (contentList) {
                                //console.log(chapterList);
                                angular.forEach(contentList, function(chapter, i){
                                    console.log("Capitulo [" + chapter.id +"] de la temporada ["+chapter.season+"]");
                                });
                                fullList[idx] = contentList;                                
                            });
                            deferred.resolve(fullList);
                        });

                        // RECUPERAMOS EL ARRAY CON TODO EL CONTENIDO UNA VEZ SE HA COMPLETADO
                        var fullContent = $q.when(deferred.promise).then(function(fullContent){
                            console.log("FULL LIST :: ", fullContent);
                            loadCarouselList(fullContent);
                        });

                        $(".carousel").ready(function(){
                            if (season !== undefined){
                                $("."+season).click();
                            }
                        });
                    }
                });
            }
        }

        $scope.detailedItemClick = function(item){
            console.log("RENDERIZANDO EL DETALLE DE :: ", item);
            $scope.itemDetail.title = item.title;
            $scope.itemDetail.description = item.description;
            $scope.itemDetail.url = item.url.player.player;
            $scope.itemDetail.urlplay = item.urlplay.sd;
            console.log($scope.itemDetail);
            $scope.contentTemplate = 'templates/contentDetail.html';
        }

        loadCarouselList = function(fullContent){
            $scope.fullContentList = fullContent;
            $scope.contentTemplate = 'templates/carouselList.html';
        }

        $scope.loadPlayer = function (item) {
            //$scope.sourcePlayer = 'http://butlerccwebdev.net/support/html5-video/media/bigbuckbunnytrailer-480p.mp4';
            console.log("PLAYING - ", item);
            //$scope.sourcePlayer = item.urlplay;
            $scope.contentTemplate = 'templates/videoPlayer.html';
                       
            console.log("PLAYER:: ",$scope.player);            

            //$scope.srcPlay = "http://butlerccwebdev.net/support/html5-video/media/bigbuckbunnytrailer-480p.mp4";
            //$scope.player.load('http://butlerccwebdev.net/support/html5-video/media/bigbuckbunnytrailer-480p.mp4');
            //$scope.player.play();            
            
        }
        
        
        changeContext = function(contentType, data) {
            console.log("CAMBIANDO CONTEXTO A :: ", contentType);
            var dataContent = serviceData.callService(contentType,false);
            dataContent.then(function (dataContent) {
                //console.log("dataContent::",dataContent);        
                angular.forEach(dataContent, function (item, i) {
                    //console.log (item);      
                    $scope.listItem[i] = item;                    
                });
                $scope.currentContentType = contentType;
                amplify.publish("loadSeasonList",data);                
            });
        }

        getIndexFromItem = function(elemId){
            var elemento = ""
            console.log("getIndex From item :: ", elemId.toString());
            if (elemId !== ""){
                var elemList = $(".list-item-content");
                angular.forEach(elemList, function(elem, i){
                    if (elem.id == elemId.toString()){
                        console.log("ENCONTRADO ELEMENTO [" + (i) + "] para ::" + elemId);
                        elemento = i;
                    }
                });
            }
            console.log("DEVOLVIENDO ELEMENTO [" + elemento + "] para ::" + elemId);
            return elemento;
            
        }

        
        /* ################################################################################## */
        /* SUBSCRIPCION DE EVENTTOS ######################################################### */
        /* ################################################################################## */

        amplify.subscribe("loadDefaultLayer", function(data){
            $scope.getContentByType("Cine", false);
        });

        amplify.subscribe("loadInitialContent", function (data){
            console.log("EVENTO LOAD INTIAL CONTENT ", data.context, data.contentType);
            $scope.getContentByType(data.contentType, data.context);
            console.log("Guardamos el nuevo nivel seleccionado");
            //serviceData.updateCurrentLayer(serviceData.getNavigationLayers.list);
        });

        amplify.subscribe("loadSeasonList", function (data){

            console.log("EVENTO LOAD SEASON LIST - Elemento ["+ data.elemId +"] - Temporada [" + data.defaultSeason + "]");
            var index;

            angular.forEach($scope.listItem, function(n,i){
                console.log(n.id, data.elemId[0]);
                if (n.id === data.elemId[0]) {
                    index = i;
                }                
            });
            if (index !== undefined) {
                $scope.selectedItemClick(index, data.defaultSeason);
            } else {
                changeContext(data.contentType, data);
            }           
            
        });

        amplify.subscribe("loadChapterDetail", function(data){
            
            console.log("EVENTO loadChapterDetail ");

            var itemId = data.itemId;
            var seasonId = data.seasonId;
            var elemId = (data.elemId.length > 0 ) ? data.elemId[0] : "";
            var itemToGo;
            
            if ($scope.currentContentType.toLowerCase() === "cine"){
                /*angular.forEach($scope.listItem, function(n,i){
                    if (i+1 === itemId){
                        //itemToGo = n;
                        console.log("autoclick en elemento :: ", i);
                        $scope.listItem[i].url = n.urldetail;
                        $scope.selectedItemClick(i);
                    }
                    console.log("REPRODUCIENDO CINE :: ", "-",  n ,"-", i,"-", itemId,"-", seasonId);
                });*/
                var elemIndex = getIndexFromItem(elemId);
                $scope.listItem[elemIndex].url = $scope.listItem[elemIndex].urldetail;
                $scope.selectedItemClick(elemIndex);
            }else{
                angular.forEach($scope.fullContentList, function(seasonItem, i){
                console.log("TEMPORADA [" + seasonItem[0].season + "], ELEMENTO [" +  seasonId +"]", seasonItem );
                if (seasonItem[0].season.toString() === seasonId.toString()){
                    console.log("EVENTO loadChapterDetail - Renderizando elemento ", seasonItem[itemId]);
                    itemToGo = seasonItem[itemId-1];

                    /*angular.forEach(seasonItem, function(contentItem, idx){
                        if (idx === itemId){
                            console.log("EVENTO loadChapterDetail - Renderizando elemento ", contentItem);
                            $scope.detailedItemClick (contentItem);
                        }
                    });*/
                }
                });
            }

            

            if (itemToGo !== undefined) $scope.detailedItemClick (itemToGo);

        });

        amplify.subscribe("goToSeason", function( data ){
            angular.element("#sea"+data.season).click();
        });

        amplify.subscribe("updatePlayer", function(data) {
            console.log(data);
            if (data.order === "play"){
                console.log("Reproduciendo ...");
                //$scope.playerApi.play();
                $scope.loadPlayer($scope.itemDetail);
            } else if (data.order === "pause") {
                $scope.playerApi.pause();
            } else if (data.order === "stop") {
                $scope.playerApi.stop();
            }
            //$scope.playerApi.play();
        });


        amplify.subscribe("updateCurrentContext", function(){
            serviceData.setCurrentViewContext(
                {
                    currentListItem: $scope.listItem,
                    currentCategory: $scope.currentContentType
                }
            );
        });


        $scope.onPlayerReady = function (api) {
            $scope.playerApi = api;
            console.log("API PLAYER CARGADA ...", $scope.playerApi);
            $scope.config = {
                autoPlay: true,
                sources: [
                    { src: $sce.trustAsResourceUrl("http://butlerccwebdev.net/support/html5-video/media/bigbuckbunnytrailer-480p.mp4"), type: "video/mp4" }

                ],
                /*tracks: [
                    {
                        src: "http://www.videogular.com/assets/subs/pale-blue-dot.vtt",
                        kind: "subtitles",
                        srclang: "en",
                        label: "English",
                        default: ""
                    }
                ],*/
                theme: "js/modules/videogular-themes-default/videogular.css",
                plugins: {
                    poster: $scope.itemDetail.url
                }
            };

            //$scope.playerApi.play();
            //$scope.playerApi.currentState = 'play';
        }

        $scope.onChangeSource = function(source) {
            console.log("SOURCE HAS CHANGED ::", source);
            $scope.playerApi.play();
        }

        

        /*$scope.config = {
            sources: [
                { src: $sce.trustAsResourceUrl("http://butlerccwebdev.net/support/html5-video/media/bigbuckbunnytrailer-480p.mp4"), type: "video/mp4" }
                
            ],
            tracks: [
                {
                    src: "http://www.videogular.com/assets/subs/pale-blue-dot.vtt",
                    kind: "subtitles",
                    srclang: "en",
                    label: "English",
                    default: ""
                }
            ],
            theme: "node_modules/videogular-themes-default/videogular.css",
            plugins: {
                poster: "http://www.videogular.com/assets/images/videogular.png"
            }
        };*/


    }]);
