
VodafoneTVApp.config(['$sceDelegateProvider', function($sceDelegateProvider) {
  // We must whitelist the JSONP endpoint that we are using to show that we trust it
  $sceDelegateProvider.resourceUrlWhitelist([
    'self',
    'http://*/**'
  ]);
}]);
VodafoneTVApp.factory('serviceData', function($http, $q, $sce){
    
    //LOCAL
    //var hostServer = 'http://localhost';
    //var watsonServer = hostServer + ':3000';

    //PROD
    var hostServer = 'https://ibmcognitivetv.mybluemix.net';
    var watsonServer = hostServer;

    //var hostServer = '10.0.2.2';
    var _getHostServer = function(){
        return hostServer;
    }

    var _getWasonServer = function() {
        return watsonServer;
    }

    var _navigationLayers = {
        default : "defaultLayer",
        main : "mainLayer",
        list : "seasonListLayer",
        chapterList : "chapterListLayer",
        content : "contentLayer",
        player : "playLayer"
    }

    var _getNavigationLayers = function () {
        return _navigationLayers;
    }

    var _currentLayer;

    var _updateCurrentLayer = function(layer) {
        _currentLayer = layer;
    }

    var _getCurrentLayer = function () {
        return _currentLayer;
    }

    var _currentViewContext;

    var _setCurrentViewContext = function ( currentViewContext ) {
        _currentViewContext = currentViewContext;
    }

    var _callService = function (typeContent, filterList){

        console.log("_callService :: " + typeContent);
        if (typeContent !== undefined && typeContent !== ""){
            typeContent = typeContent.trim().toLowerCase();

            // AÑADIMOS EL DEFER PARA EL SERVICIO ASINCRONO
            var deferred = $q.defer();
            
            
            //$sce.trustAsResourceUrl(url);
            $http.get(hostServer+'/MyVodafoneTV/controller/mock_servicios/'+ typeContent +'.json')
            //$http.jsonp(url, {jsonpCallbackParam: 'callback'})
            .then(
                //function success(response) {
                function successCallback(response) {
                                        
                    //console.log("_callService jsonResponse :: ", angular.toJson(response.data) );
                    // RECIBIMOS EL JSON CON EL CONTENIDO (SIEMPRE SERA O .assets[] O .medias[])
                    var contentList;
                    var responseList = [];
                    if (response.data.assets !== undefined){
                        contentList = response.data.assets;
                    }else if (response.data.medias !== undefined){
                        contentList = response.data.medias;
                    }
                                        
                    angular.forEach(contentList, function(contentItem, i){
                        /*console.log(contentItem.id);
                        console.log(contentItem.title); 
                        console.log(contentItem.description);                      
                        console.log(contentItem.pictures.poster);*/
                        var filterDuration = function (tagList) {
                            var duration = "";
                            $.each(tagList, function (i, tag) {
                                //console.log("TAG :: ", i, tag);
                                if (tag.key === "Runtime") {
                                    duration = tag.value;
                                }
                            });
                            return duration;
                        }

                        var item = {
                            id: contentItem.id,
                            title: contentItem.title,
                            description: contentItem.description,
                            //url: (typeContent === "cine") ? contentItem.pictures.player : contentItem.pictures.poster
                            url: contentItem.pictures.poster,
                            urldetail: (typeContent === "cine") ? contentItem.pictures.player : contentItem.pictures.banner,
                            duration: filterDuration(contentItem.tags_metas)
                        };

                        if (filterList === false){
                            responseList[i] = item;
                        } else if (filterList.indexOf(contentItem.id)!==-1){
                            responseList[filterList.indexOf(contentItem.id)] = item;
                        }

                    });
                    console.log("_callService service response :: ", responseList );

                    //ENLAZAMOS LA RESPUESTA AL DEFER UNA VEZ QUE LA TENEMOS
                    deferred.resolve(responseList);
                },
                function errorCallback(response) {
                    console.log("Se ha producido un error al procesar la llamada", response);
                    deferred.reject("Se ha producido un error al procesar la llamada" + response);
                }
            );
            //DEVOLVEMOS LA RESPUESTA UNA VEZ HA SIDO COMPLETADA;
            //return deferred.promise;
            return $q.when(deferred.promise);
        }
    };

    var _getContentList = function (itemId, seasonId, typeContent) {
        console.log("Obteniendo el item [" + itemId + "] para la temporada ["+seasonId+"] y tipo [" + typeContent + "]");
        if (typeContent !== undefined && typeContent !== ""){
            typeContent = typeContent.trim().toLowerCase();
            var deferred = $q.defer();

            //var path = typeContent + '/'+ itemId + '/'+ seasonId +'/episodes.json';
            
            $http.get(hostServer+'/MyVodafoneTV/controller/mock_servicios/'+ typeContent + '/'+ itemId + '/'+ seasonId +'/episodes.json')
            //$http.jsonp(url)
            .then(
                function successCallback(response) {
                    //console.log(response);
                    var itemList = [];
                    angular.forEach(response.data.assets, function(episodeItem, i){
                        $http.get(hostServer+'/MyVodafoneTV/controller/mock_servicios/'+ typeContent + '/'+ itemId + '/'+ seasonId +'/'+ episodeItem.id +'.json')
                        .then(
                            function successCallback(response) {
                                var elemento = response.data.medias[0];
                                var item = {
                                    id: elemento.id,
                                    title: elemento.title,
                                    description: elemento.description,
                                    episode_number: episodeItem.episode_number,
                                    season: seasonId,
                                    url: {
                                        img : {
                                            banner : elemento.series.pictures.banner,
                                            poster : elemento.series.pictures.poster
                                        },
                                        player : {
                                            player : elemento.pictures.player,
                                            poster : elemento.pictures.poster
                                        }
                                    },
                                    urlplay:{
                                        sd : elemento.files.sd.url,
                                        //hd : elemento.files.hd.url
                                    }
                                };

                                itemList[i] = item;
                                console.log("ELEMENTO EXTRAIDO :: ", item);
                            },
                            function errorCallback(response) {
                                console.log("Se ha producido un error al procesar la llamada", response);
                                deferred.reject("Se ha producido un error al procesar la llamada" + response);
                            }
                        );    
                    });
                    deferred.resolve(itemList);
                },
                function errorCallback(response) {
                    console.log("Se ha producido un error al procesar la llamada", response);
                    //deferred.reject("Se ha producido un error al procesar la llamada" + response);
                }
            );
            return $q.when(deferred.promise);
        }
    }

    var _getSeasonList = function (itemId, typeContent) {
        console.log("Obteniendo el item [" + itemId + "] para el tipo ["+typeContent+"]");
        if (typeContent !== undefined && typeContent !== ""){
            typeContent = typeContent.trim().toLowerCase();

            var deferred = $q.defer();
            $http.get(hostServer+'/MyVodafoneTV/controller/mock_servicios/'+ typeContent + '/'+ itemId + '/'+ itemId +'.json')
            .then(
                function successCallback(response) {
                    console.log(response);
                    var seasonData = {
                        total_seasons : response.data.medias[0].total_seasons,
                        seasons : response.data.medias[0].seasons
                    }
                    deferred.resolve(seasonData);
                },
                function errorCallback(response) {
                    console.log("Se ha producido un error al procesar la llamada", response);
                    deferred.reject("Se ha producido un error al procesar la llamada" + response);
                }
            );
            //DEVOLVEMOS LA RESPUESTA UNA VEZ HA SIDO COMPLETADA;
            //return deferred.promise;
            return $q.when(deferred.promise);
        }
    }

    var initialList = ["inf1","adu1","ser1","juv1"];
    var categoriaList = ["cine", "infantil", "series"];


    var _searchByTime = function (duration) {

        amplify.publish("updateCurrentContext");
        var itemList = [];
        if (_currentViewContext.currentListItem !== [] ){
            var getPromiseItemList = function (currentList) {
                var deferred = $q.defer();
                var promise = deferred.promise;
                deferred.resolve(currentList);
                return promise;
            }
            //itemList =_currentViewContext.currentListItem;
            itemList = getPromiseItemList(_currentViewContext.currentListItem);            
        }else {
            itemList = _callService("cine", false);
        }

        //var itemList = _callService("cine", false);
        var returnList = [];
        var deferred = $q.defer();
        itemList.then(function (itemList) {
            console.log("Buscando en el listado de peliculas limitadas por tiempo", itemList);
            angular.forEach(itemList, function(item, i){
                if (item.duration < duration){
                    returnList.push(item);
                }
            });
            //returnList = parseList(returnList);
            console.log("_searchByTime :: Elementos con tiempo superior a " + duration + ": ", returnList);
            deferred.resolve(returnList); 
        });
        return $q.when(deferred.promise);
    }


    var _translateTime = function (endDateString, timeZone) {
        var endArray = endDateString.split(":");
        var duration;
        console.log("endArray", endArray);
        if (endArray.length > 0) {
            var currentDate = new Date();
            var endDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
                endArray[0],
                endArray[1],
                endArray[2],
                0);
            if (timeZone === "GMT"){
                var offset = currentDate.getTimezoneOffset()/60 * -1;
                endDate.setHours(endDate.getHours() + offset);
            }
            console.log("EndDate", endDate);
            console.log("currentDate", currentDate);
        }
        var duration = (endDate.getTime() - currentDate.getTime()) / 60000;
        console.log("Buscando una serie que acabe en :: ", duration);
        return Math.floor(duration);
    }

    var _translateContent = function(typeContent, listToSearch){
        
        var translateList = [];
        var deferred = $q.defer();
        var arrayToSearch = [];
        var returnList = [];
        console.log("lista de elementos a buscar ID :: ", listToSearch);
        angular.forEach(listToSearch, function(item, i){
            arrayToSearch[i]=item.id;
        });
        $http.get(hostServer + '/MyVodafoneTV/controller/mock_servicios/content.json')
        .then(
            function successCallback(response) {
                var responseArray=[];
                angular.forEach(response.data[typeContent], function(item, i){
                    console.log("ITEM :: ", item.id ,i);
                    responseArray[item.id.toString()]=i;
                });
                if (responseArray !== [] && arrayToSearch.length>0){
                    angular.forEach(arrayToSearch, function(itemToSearch, indexName){
                        console.log("Buscando ", itemToSearch);
                        if (responseArray[itemToSearch] !== undefined){
                        //if ($.inArray(itemToSearch.id, arrayToSearch)){
                            console.log(itemToSearch, " está en la lista ");
                            returnList.push(responseArray[itemToSearch]);
                        } else {
                            console.log(itemToSearch, " NO está en la lista ");
                        }
                    });
                }
                deferred.resolve(returnList);
            },
            function errorCallback(response) {                    
                console.log("Se ha producido un error al procesar la llamada", response);
                deferred.reject("Se ha producido un error al procesar la llamada" + response);
            }

        );
        return $q.when(deferred.promise);
    }

    //var _translateWatsonList = function (typeContent, filterPreview, filterParams){
    var _translateWatsonList = function (filterParams){
        console.log("######################################################################");
        console.log("###########  TRADUCIENDO ELEMENTOS CON FILTRO :: ", filterParams, " ##");
        console.log("#######################################################################");
        var deferred = $q.defer();
        if (filterParams.filterTime !== "" && filterParams.filterTimeZone !== "") {
            console.log("FILTRO :: TIEMPO - Buscando contenido que acabe antes de ", filterParams.filterTime);
            var duration = _translateTime(filterParams.filterTime, filterParams.filterTimeZone);
            var timeList = _searchByTime(duration);
            timeList.then(function(timeList){
                console.log("Elementos con tiempo superior a " + duration + ": ", timeList);
                var translatedContent = _translateContent(filterParams.categoria, timeList);
                translatedContent.then(function(translatedContent){
                    translatedContent = translatedContent.sort();
                    var wContext = {
                        cliente : "Alejandro",
                        categoria : filterParams.categoria,
                        contenido_previsualizar : translatedContent                        
                    }
                    amplify.publish("sendMessageTime", wContext);
                    console.log("Contenido a enviar a WATSON :: ", translatedContent);
                });

            });            
        } else {

        $http.get(hostServer+'/MyVodafoneTV/controller/mock_servicios/content.json')
        .then(
            function successCallback(response) {
                console.log("Response from http://localhost/MyVodafoneTV/controller/mock_servicios/content.json", response.data);
                var translatedList = [];

                var firstType = (filterParams.contenido_previsualizar[0]!==undefined) ? filterParams.contenido_previsualizar[0].substring(0,3) : "";   
                /*if (initialList.indexOf(firstType)===-1 && filterParams.filterVideo !== ""){
                    console.log("Vamos a tratar un video");
                    _updateCurrentLayer(_navigationLayers.player);
                } else if (initialList.indexOf(firstType)===-1 && filterParams.filterChapter !== "" && filterParams.filterSeason !== ""){
                    console.log("FILTRANDO POR UN CAPITULO");
                    _updateCurrentLayer(_navigationLayers.content);  
                } else if (initialList.indexOf(firstType)===-1 && filterParams.filterChapter === "" && filterParams.filterSeason !== "") {
                    console.log("FILTRANDO POR UNA TEMPORADA");
                    _updateCurrentLayer(_navigationLayers.chapterListLayer);  
                } else if (initialList.indexOf(firstType)===-1 && (filterParams.filterName !== "" || filterParams.filterId !== "")){
                    console.log("FILTRANDO POR UN ITEM (SERIE, PELICULA, ...) ", filterParams.filterName, response.data[typeContent], filterParams.filterId);
                    angular.forEach(response.data[typeContent], function(item, i){
                        console.log(item, item.name, i);
                        if (i === filterParams.filterId){
                            translatedList[0] = item.id;
                            console.log("ENCONTRADO EL ELEMENTO ... ", translatedList[0]);
                        }
                    });
                    _updateCurrentLayer(_navigationLayers.list);                    
                }else{                     

                    console.log("FILTRANDO POR LISTADO ... ");
                    if (typeContent !== undefined){
                        angular.forEach(filterPreview, function(item, i){                    
                            console.log(item, i);
                            translatedList[i] = response.data[typeContent][item].id;                        
                        });
                    }else{
                        translatedList = [];
                    }
                    _updateCurrentLayer(_navigationLayers.main);
                }*/

                console.log("COMPARE ARRAYS",initialList, filterParams.contenido_previsualizar);
                if (angular.equals(initialList, filterParams.contenido_previsualizar)){
                    console.log("contenido inicial");
                    _updateCurrentLayer(_navigationLayers.default);
                    if (filterParams.categoria === 'cine' && filterParams.filterName !== "" && filterParams.filterId !== ""){
                        _updateCurrentLayer(_navigationLayers.content);
                    }
                }else if (filterParams.contenido_previsualizar.length > 0 && categoriaList.indexOf[filterParams.categoria] !== -1 
                    && filterParams.filterName === "" 
                    && filterParams.filterId ===""
                    && filterParams.filterSeason ===""){
                    console.log("FILTRO :: FILTRANDO POR LISTADO ... ");
                     if (filterParams.categoria !== undefined){
                        angular.forEach(filterParams.contenido_previsualizar, function(item, i){                    
                            console.log(item, i);
                            translatedList[i] = response.data[filterParams.categoria][item].id;                        
                        });
                    }else{
                        translatedList = [];
                    }   
                    _updateCurrentLayer(_navigationLayers.main);
                } else if (filterParams.contenido_previsualizar.length > 0 && filterParams.filterName !== "" && filterParams.filterId !== "") {
                     console.log("FILTRO :: FILTRANDO POR UN ITEM (SERIE, PELICULA, ...) ", filterParams.filterName, filterParams.categoria, filterParams.filterId);
                      angular.forEach(response.data[filterParams.categoria], function(item, i){
                        console.log(item, item.name, i);
                        if (i === filterParams.filterId){
                            translatedList[0] = item.id;
                            console.log("ENCONTRADO EL ELEMENTO ... ", translatedList[0]);
                        }
                    });
                    if (filterParams.categoria === 'cine'){
                        _updateCurrentLayer(_navigationLayers.content);
                    } else {
                        _updateCurrentLayer(_navigationLayers.list);
                    }
                } else if (filterParams.contenido_previsualizar.length > 1 
                    && filterParams.filterName === "" 
                    && filterParams.filterId === ""
                    && filterParams.filterSeason !== ""
                    && filterParams.filterChapter === "") {
                    console.log("FILTRO :: FILTRANDO ENTRE TEMPORADAS ", filterParams.filterSeason);
                    _updateCurrentLayer(_navigationLayers.chapterList);
                } else if ( filterParams.filterChapter !== "" && filterParams.filterSeason !== ""){
                     console.log("FILTRO :: DETALLE UN CAPITULO");
                    _updateCurrentLayer(_navigationLayers.content); 
                } else if ( filterParams.filterVideo !== "") {
                    console.log("FILTRO :: TRATANDO VIDEO ...");
                    _updateCurrentLayer(_navigationLayers.player);
                }

                console.log("ELEMENTOS TRADUCIDOS :: ", translatedList);
                deferred.resolve(translatedList);
            },
            function errorCallback(response) {
                console.log("Se ha producido un error al procesar la llamada", response);
                deferred.reject("Se ha producido un error al procesar la llamada" + response);
            }            
        );
        }
        return $q.when(deferred.promise);        
    }
    

    return {    
        callService : _callService,
        getSeasonList: _getSeasonList,
        getContentList : _getContentList,
        translateWatsonList : _translateWatsonList,
        getHostServer : _getHostServer,
        getWasonServer: _getWasonServer,
        updateCurrentLayer : _updateCurrentLayer,
        getCurrentLayer : _getCurrentLayer,
        getNavigationLayers: _getNavigationLayers,
        setCurrentViewContext : _setCurrentViewContext,
        translateTime : _translateTime
    }

});