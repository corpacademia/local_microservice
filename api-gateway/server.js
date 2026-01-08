const {app,server} = require('./src/app')

const PORT = process.env.PORT;
server.listen(PORT,(err)=>{
    if(err){
        console.log("Error running api-gateway service")
    }
    else{
        console.log(`api gateway is running on PORT:${PORT}`);
    }
    
});