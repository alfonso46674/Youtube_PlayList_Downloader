const express = require('express')
const port = 4000
const app = express()
const axios = require('axios')
const fs = require('fs')
const ytdl = require('ytdl-core')
const cors = require('cors')
app.use(cors())

const credentials = require('./credentials')

const PLAYLIST_ID = "PLaV6FKYP2zzE5qjtiAXZiCej2BD3EJGn_"
// PLaV6FKYP2zzE5qjtiAXZiCej2BD3EJGn_ test
// PLaV6FKYP2zzHSbavzgd5TmK1dDoLALVIj mixes


const getPlayListItems = async playListID => {
    const result = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems',{
        params:{
            part: 'id, snippet',
            playlistId: playListID,
            maxResults:100,
            key: credentials.API_KEY
        }
    });
    return result.data;
};
let counter = 1;
let temporalVideos = []; // array with the videos from the playlist

getPlayListItems(PLAYLIST_ID).then(data =>{

    
    data.items.forEach(element =>{
        
        //Push every video to the temporalVideos array
        temporalVideos.push({
            id: counter,
            videoId: element.snippet.resourceId.videoId,
            downloaded: false
        })
        counter++
    })

    // json where the videos are stored with extra metadata
    let dataVideos = JSON.parse(fs.readFileSync('./videos.json'))

    //Populate the json with the videos for the first time
    if(dataVideos.length == 0 || undefined){
        fs.writeFileSync('./videos.json', JSON.stringify(temporalVideos))
    }

    
    //update the json with new videos
    // Checks the new added videos to the playlists and updates the json
    for(let i = 0; i < temporalVideos.length; i++){
        
        //if there is a video in temporal that is not in the json, then it is added to the json
        if(dataVideos.find(v =>v.videoId == temporalVideos[i].videoId) == undefined){

            console.log("Video not included with the id : " + temporalVideos[i].id);
            dataVideos.push({
                id: dataVideos[dataVideos.length-1].id + 1,
                videoId: temporalVideos[i].videoId,
                downloaded: false
            })
            fs.writeFileSync('./videos.json', JSON.stringify(dataVideos))
        } 
    }

    //Deletes videos from the json that have been removed from the temporal
    for(let i = 0; i < dataVideos.length; i++){
         //if there is a video in the json that is not in the temporal, then it must be removed from the json
        if(!(temporalVideos.find(v => v.videoId == dataVideos[i].videoId))){
            console.log("No longer existing video in the playlist with id: " + dataVideos[i].id);

            //filters out the video that was removed from the temporal playlist
            dataVideos = dataVideos.filter(v => v.id != dataVideos[i].id)

            fs.writeFileSync('./videos.json', JSON.stringify(dataVideos))
        }
    }

    console.log(temporalVideos);
    console.log(dataVideos);

    //calls function to download videos
    downloadVideos()
})





// console.log("Running at port: " + port)
app.listen(port)


async function downloadVideos(){
    try {
        let urlYoutube = 'https://www.youtube.com/watch?v='
        let dataVideos = JSON.parse(fs.readFileSync('./videos.json'))
        let title = 'audio'
        let counter = 0;

        for(let i = 0; i < dataVideos.length; i++){
            // if the song has not been downloaded
            if(dataVideos[i].downloaded == false){

                console.log("Initiating download for video with id: " + dataVideos[i].id);
                let url = urlYoutube + dataVideos[i].videoId

                await ytdl.getBasicInfo(url,{
                    format: 'mp4',
                }, (err, info)=>{
                    title = info.player_response.videoDetails.title;
                });
                
                let folderDestination = './Downloads/'+title + '.mp3'
                let writable = fs.createWriteStream(folderDestination);
    
                 let readable = await ytdl(url,{
                    format: 'mp3',
                    filter: 'audioonly'
                }) //.pipe(writable)
                
    
               readable.on('data',(chunk)=>{
                    // console.log(`Received ${chunk.length} bytes of data.`);
                    writable.write(chunk);
                })
    
               readable.on('end', ()=>{
                    // console.log('There will be no more data.');
                    writable.end();
                })
    
                writable.on('finish', ()=>{
                    console.log("Done downloading video with id: " + dataVideos[i].id);
                    counter++
                    
                    //update the downloaded status of the song in the json
                    dataVideos[i].downloaded = true;
                    fs.writeFileSync('./videos.json', JSON.stringify(dataVideos))

                    //exits process when all of the videos are done being downloaded
                    if(counter == dataVideos.length){
                        process.exit()
                    }
                })
                //if the song has already been downloaded
            }else{
                console.log("Video with id: " + dataVideos[i].id + ' has already been downloaded ');
            }
          

            
        }

       

        
    } catch (error) {
        console.log(error);
    }
}