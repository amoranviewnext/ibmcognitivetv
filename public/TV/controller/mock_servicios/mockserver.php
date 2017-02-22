<?php
    
    header('Content-type:application/json;charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    $typeRequest = $_GET['typeRequest'];
    $pathFile = $_GET['pathFile'];



    if ($typeRequest == "mainLayer"){
        $jsonFile = file_get_contents('./'.$pathFile, FILE_USE_INCLUDE_PATH);
    } else if ($typeRequest == "seasonLayer") {
        http://'+hostServer+'/MyVodafoneTV/controller/mock_servicios/'+ typeContent + '/'+ itemId + '/'+ seasonId +'/episodes.json
        $jsonFile = file_get_contents('./'.$pathFile, FILE_USE_INCLUDE_PATH);
    } else if ($typeRequest == "listLayer") {

    } else if ($typeRequest == "contentLayer") {

    }
    

    
    echo $_GET['callback'] .'('.$jsonFile.')';
?>