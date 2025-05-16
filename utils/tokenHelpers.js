const jwt = require("jsonwebtoken")
const isTokenIncluded =(req) => {
   
    return (
        req.headers.authorization && req.headers.authorization.startsWith("Bearer")
    )

}

const getAccessTokenFromHeader = (req) => {

    const authorization = req.headers.authorization

    const access_token = authorization.split(" ")[1]

    return access_token
}

const generateJwtFromUser = (user) => {
    const payload = {
        email: user.email,
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE
    })
    return token
}

const sendToken = (user,statusCode,res)=>{

    const token = generateJwtFromUser(user)

    return res.status(statusCode).json({
        success: true ,
        token
    })

}



module.exports= {isTokenIncluded , getAccessTokenFromHeader , sendToken,generateJwtFromUser}