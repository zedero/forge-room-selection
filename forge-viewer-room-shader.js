
function RoomShaderExtension(viewer, options) {

    // base constructor 
    Autodesk.Viewing.Extension.call(this, viewer, options);

    var _viewer = viewer; 
    
    //check all rooms of specific floor in this model
    var _specificFloorName = '02 - Floor'; 
    //to create a material with specific prefix
    var _customMaterialPrefix = 'forge-material-face-';
    //to create a overlay that renders the shader faces
    var _overlaySceneName = "overlay-room-geometry";
    //store rooms info of this specific floor
    var _specific_Floor_Rooms_Array = [];
 
    
    var _materialArray = []; 
    
     // for hide/show shader faces
     //store all textures of the shader face
     var _oldTextures = new Array();
     //store all color of the shader face
     var _oldColors = new Array(); 
        

    this.load = function() {  
        

        //create a default face material 
        _defaultFaceMaterial =  createFaceMaterial("#b4ff77", 0.9, true);

        //hex color array for different rooms
        var colorHexArray = ["#ff77b4", "#b4ff77", "#77b4ff", "#c277ff", "#ffc277", "#f8ff77"];
        for(var k = 0; k < colorHexArray.length; k++){
            //create some materials with specific colors
            var material = createFaceMaterial(colorHexArray[k], 0.9, true);
            _materialArray.push(material);
        } 

          //create a layer
        _viewer.impl.createOverlayScene(_overlaySceneName);
        
        getRooms(); 

        
        console.log('RoomShader Extension loaded');

        return true;
    };


    this.unload = function() { 

        //remove the over layer scene
        _viewer.impl.removeOverlayScene(_overlaySceneName);
        
        return true;
    };

    this.hideShader = function() {  
        
        //get materials collection of this model
        var mats = _viewer.impl.matman()._materials;
        //define a color in grey
        var grey = new THREE.Color(0.5, 0.5, 0.5);

        //iterate each material
        for (index in mats) {

            var m = mats[index];

            if(index.includes(_customMaterialPrefix)){
                //if this is a material created for the shader face
                _oldTextures[index] = m.map;
                _oldColors[index] = m.color; 

                //set texture to null
                m.map = null;
                //set the color to the grey (but because m.transparent = true, this line does not take effect )
                m.color = grey;

                //set the material completely transparent
                m.transparent = true;
                m.opacity = 0;
                
                //notify Viewer to refresh the scene.
                m.needsUpdate = true; 
            }
        }
        _viewer.impl.invalidate(true, true, false);
    }; 

    this.showShader = function() { 

    
        //get materials collection of this model
        var mats = _viewer.impl.matman()._materials;

        //iterate each material
        for (index in mats) {
            if(index.includes(_customMaterialPrefix)){

                //if this is a material created for the shader face 
                m = mats[index]; 
                m.map = _oldTextures[index];
                m.color = _oldColors[index];;

                //make the original texture and color take effect.
                m.transparent = false;
                m.opacity = 1;
                //notify Viewer to refresh the scene. 
                m.needsUpdate = true; 
            }
        }
        _viewer.impl.invalidate(true, true, false);
    }; 


    

    function getRooms()
    { 
        _viewer.search('Rooms', 
            function (idArray) {
                console.log('rooms numbers in this floor:' + idArray.length);

              idArray.forEach(function(dbid , num) {
                            _viewer.getProperties(dbid,
                                function(propData) {
                                    //check if this room is from specific floor
                                    var findit = propData.properties.filter(function(item) { 
                                        return (item.displayName === 'Type'
                                        && item.displayValue === 'Rooms');
                                    });
    
                                    if(findit.length > 0){
                                        //if this is from specific floor, add it to the array
                                        let id = propData.properties.filter(function(item) {
                                          return (item.displayName === 'child');
                                        });
                                        console.log(id)
                                        _specific_Floor_Rooms_Array.push({roomid:id[0].displayValue,
                                                                 defaultcolor:null,
                                                                 facemeshes:null}) 
                                    } 
                                    if (num > idArray.length -2 )
                                    {
                                        renderRoomShader();
                                    }
                                },
                                function(errCode, messageStr) {
                                    console.log("ERROR: get object properties: " 
                                                + errCode + " " 
                                                + messageStr);
                                }
                            );
                            
                        }); 
                },
            function(err){
                console.log('ERROR: viewer search: ' + err);
            });  
    
    }
    
    function renderRoomShader( )
    {
        console.log('room number in this specific floor:' 
            +  _specific_Floor_Rooms_Array.length);
    
        var  colorIndex = 0;
      _specific_Floor_Rooms_Array.forEach(
            function(room, num){
            
            if(colorIndex > 5)
                colorIndex = 0;
    
            var faceMeshArray = [];
    
            var instanceTree =  _viewer.model.getData().instanceTree;
            instanceTree.enumNodeFragments(room.roomid, function(fragId){
                    var renderProxy = _viewer.impl.getRenderProxy(
                         _viewer.model,
                        fragId);
            
                    var matrix = renderProxy.matrixWorld;
                    var indices = renderProxy.geometry.ib;
                    var positions = renderProxy.geometry.vb;
                    var stride = renderProxy.geometry.vbstride;
                    var offsets = renderProxy.geometry.offsets;
                
                    if (!offsets || offsets.length === 0) {
                        offsets = [{start: 0, count: indices.length, index: 0}];
                    }
                
                    var vA = new THREE.Vector3();
                    var vB = new THREE.Vector3();
                    var vC = new THREE.Vector3();
        
    
                    for (var oi = 0, ol = offsets.length; oi < ol; ++oi) {
                
                        var start = offsets[oi].start;
                        var count = offsets[oi].count;
                        var index = offsets[oi].index;
                
                        var checkFace = 0;
        
                        for (var i = start, il = start + count; i < il; i += 3) {
                        
                            var a = index + indices[i];
                            var b = index + indices[i + 1];
                            var c = index + indices[i + 2];
                
                            vA.fromArray(positions, a * stride);
                            vB.fromArray(positions, b * stride);
                            vC.fromArray(positions, c * stride);
                    
                            vA.applyMatrix4(matrix);
                            vB.applyMatrix4(matrix);
                            vC.applyMatrix4(matrix);
                
                            var faceGeometry = createFaceGeometry(vA, vB, vC);
                            var faces = faceGeometry.faces;
        
                            for(var f = 0; f < faces.length; f++){
                                     var faceMesh = drawFaceMesh(faceGeometry,
                                      _overlaySceneName, 
                                      _materialArray[colorIndex],
                                      renderProxy);
                                    faceMeshArray.push(faceMesh); 
                            }
                        }
                    }
                });
    
            room.defaultcolor = _materialArray[colorIndex];
            room.facemeshes = faceMeshArray;
    
            colorIndex++;
     
     
        }); 
           
    }
     
     
    function createFaceGeometry(vA, vB, vC, geom,color){
     
        if(!geom){
           var geom = new THREE.Geometry();
        }
     
        var vIndex = geom.vertices.length;
     
        geom.vertices.push(vA.clone());
        geom.vertices.push(vB.clone());
        geom.vertices.push(vC.clone());
     
        var face = new THREE.Face3(vIndex, vIndex + 1, vIndex + 2);
       
        //face.color.setRGB(color.R,color.G,color.B);
        geom.faces.push(face);
        geom.computeFaceNormals();
     
        return geom;
    }
     
    function drawFaceMesh(geom, overlaySceneName, material, mesh){
     
        if(!material) {
            material = _faceMaterial
        }
       
        var faceMesh = new THREE.Mesh(geom, material);  
        _viewer.impl.addOverlay(_overlaySceneName, faceMesh);
      
        return faceMesh;
       
    }
    
    //create material and add it to Forge Viewer object stack
    function createFaceMaterial(colorhex, opacity, transparent) {
    
        var colorHexStr = colorhex;
        var colorThreeStr = colorHexStr.replace('#', '0x');
        var colorValue = parseInt(colorThreeStr, 16);
    
        var material = new THREE.MeshPhongMaterial({
            color: colorValue,
            opacity: opacity,
            transparent: transparent,
            side: THREE.DoubleSide
        });
    
        _viewer.impl.matman().addMaterial(
           _customMaterialPrefix + newGUID(),
            material,
            true);
    
        return material;
    }
    
    
    function newGUID() {
    
        var d = new Date().getTime();
    
        var guid = 'xxxx-xxxx-xxxx-xxxx-xxxx'.replace(
            /[xy]/g,
            function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
            });
    
        return guid;
    }
}

RoomShaderExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
RoomShaderExtension.prototype.constructor = RoomShaderExtension; 

 
Autodesk.Viewing.theExtensionManager.registerExtension('RoomShaderExtension',
RoomShaderExtension);

  