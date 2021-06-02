const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const app = express();
app.use(express.urlencoded());
app.use(express.json());
const cors = require('cors');
const upload = multer({dest: __dirname + '/uploads/images'});
var port = process.env.PORT || 5000;
var mysql = require('mysql');
var connection = mysql.createConnection({host: 'localhost', user: 'root',password: '',database:'snatch'});
connection.connect(function(err){if(err) res.json({code: -4}); else console.log("Connected to Snatch servers!")});
const secret = "9051b22b7971583bf968d7bfea260a85c4823822db664efbe4379d914e890de2a5cc75f51da08c4ae50fe48413223592099410a3d7243d64f6858fade57642a2";
console.log(secret);
const corsOpts = {
    origin: '*',
  
    methods: '*',
  
    allowedHeaders: '*',
  };
  
  app.use(cors(corsOpts));

  app.get('/profile', (req,res) => {

    var auth_token = req.headers.authorization;
    console.log(auth_token);
    jwt.verify(auth_token, secret, function(err, decoded) {
        if(err) res.json({code: 55});
        console.log(decoded);
        var email = decoded.posted_email.toString();
        checkQuery = "SELECT name,city,created_at FROM users_login WHERE email_id = '" + email + "'";
        checkProduct = "SELECT * FROM products WHERE user_email = '" + email + "'";
    connection.query(checkQuery, function(error, result){
        if(result.length!=0) 
        {
            connection.query(checkProduct, function(errors, results){
                if(results.length!=0) 
                {
                    res.json({profile: result, product: results, code: 200});
                }
                else if(errors) res.json({code:-4})
            })
        }
    else if(error) res.json({code: -4});
      });

  });
});


app.post('/register', (req, res) => {
    posted_email = req.body.email;
    posted_password = req.body.password;
    posted_city = req.body.city;
    posted_name = req.body.name;
    checkQuery = "SELECT * FROM users_login WHERE email_id = '" + posted_email + "'";
    console.log(req.body);
    connection.query(checkQuery, function(err, result){
        if(err) res.json({code: -4});
        else if(result.length!=0) 
        {
            console.log("User already REGISTERED! Provide new email.");
            res.send({prompt: 'User already REGISTERED! Provide new email.', code: 1});
        }
        else if(!result) 
        {
            console.log("DATABASE ERROR!");
            res.send({prompt: 'Database Error!'});
        }
        else
        {
            const hash = crypto.createHmac('sha256', secret).update(posted_password.toString()).digest('hex');
            console.log(hash);
            registerQuery = "INSERT INTO users_login (email_id, password_hash,city,name) VALUES ('" + posted_email + "','" + hash + "','" + posted_city  + "','" + posted_name+ "')";
            connection.query(registerQuery, function(err, result){
                if(err) res.json({code: -4});
                else if(result) 
                {
                    console.log("New User REGISTERED successfully! Make Profile.");
                    res.send({prompt: 'New User REGISTERED successfully!', code: 200});
                }
                else
                {
                    console.log("DATABASE ERROR!");
                    res.send({prompt: 'Data Base Error!', code: -4});
                }
            });
        }
    });
});

app.post('/logout', (req, res) => {
    posted_email = req.body.email;
    cart_data = JSON.stringify(req.body.cart);
    checkQuery = "UPDATE users_login SET cart='"+ cart_data +"' WHERE email_id = '" + posted_email +"'";
    console.log(checkQuery);
    connection.query(checkQuery, function(err, result){
        if(err) 
        {
            console.log(err)
            res.json({code: -4});
        }
        else
        {
            console.log("Sending 200")
               res.json({prompt: 'Data daved', code: 200}); 
         }
    });
});


app.post('/login', (req, res) => {
    posted_email = req.body.email;
    posted_password = req.body.password;
    const hash = crypto.createHmac('sha256', secret).update(posted_password.toString()).digest('hex');
    console.log("Hash generated for "+posted_email+" is "+hash);
    checkQuery = "SELECT * FROM users_login WHERE email_id = '" + posted_email +"'";
    connection.query(checkQuery, function(err, result){
        if(err) res.json({code: -4});
        else if(result.length==1) 
        {
            if(result[0].password_hash.toString() != hash)
            {
                console.log("Hash generated from Database is "+result[0].password_hash);
                res.send({code: -1});
            }
            else 
            {
            console.log("Right Password!");
              var jwt_token =  jwt.sign({posted_email},secret,{expiresIn: 6000});
              console.log(jwt_token);
               res.json({token: jwt_token, code:200, cart: result[0].cart}); 
            }
         }
         else if(result.length==0) 
        {
              console.log("No such user present!");
              res.send({code: 0});
         }
        else if(!result) 
        {
            console.log("DATABASE ERROR!");
            res.send({prompt: 'Database Error!'});
        }
    });
});
    app.get('/products', (req, res) => {
        var next_offset = req.query.offset;
        var category = req.query.category;
        var filter = req.query.filter;
        var low = req.query.low || 0;
        var high = req.query.high || 9999999999999;
        var fetchQuery;
        if(filter==0)
        {
        if(category == 'all') fetchQuery = "SELECT * FROM products WHERE product_price BETWEEN "+ low +" AND " + high + " LIMIT 12 OFFSET " + next_offset.toString();
        else fetchQuery = "SELECT * FROM products  WHERE (product_price BETWEEN "+ low +" AND " + high + ") AND category='" + category + "' LIMIT 12 OFFSET " + next_offset.toString();
        }
        else if(filter==1)
        {
            if(category == 'all') fetchQuery = "SELECT * FROM products WHERE product_price BETWEEN "+ low +" AND " + high + " ORDER BY product_price ASC LIMIT 12 OFFSET " + next_offset.toString();
            else fetchQuery = "SELECT * FROM products  WHERE (product_price BETWEEN "+ low +" AND " + high + ") AND category='home' ORDER BY product_price ASC LIMIT 12 OFFSET " + next_offset.toString();
        }
        else if(filter==2)
        {
            if(category == 'all') fetchQuery = "SELECT * FROM products  WHERE product_price BETWEEN "+ low +" AND " + high + " ORDER BY product_price DESC LIMIT 12 OFFSET " + next_offset.toString();
            else fetchQuery = "SELECT * FROM products  WHERE (product_price BETWEEN "+ low +" AND " + high + ") AND category='home' ORDER BY product_price DESC LIMIT 12 OFFSET " + next_offset.toString();
        }
        else if(filter==3)
        {
            if(category == 'all') fetchQuery = "SELECT * FROM products  WHERE product_price BETWEEN "+ low +" AND " + high + " ORDER BY created_at ASC LIMIT 12 OFFSET " + next_offset.toString();
            else fetchQuery = "SELECT * FROM products  WHERE (product_price BETWEEN "+ low +" AND " + high + ") AND category='home' ORDER BY created_at DESC LIMIT 12 OFFSET " + next_offset.toString();
        }
        else if(filter==4)
        {
            if(category == 'all') fetchQuery = "SELECT * FROM products  WHERE product_price BETWEEN "+ low +" AND " + high + " ORDER BY created_at DESC LIMIT 12 OFFSET " + next_offset.toString();
            else fetchQuery = "SELECT * FROM products  WHERE (product_price BETWEEN "+ low +" AND " + high + ") AND category='home' ORDER BY created_at ASC LIMIT 12 OFFSET " + next_offset.toString();
        }
        
        console.log(fetchQuery);
        connection.query(fetchQuery, function(err, result){
            if(err) res.json({code: -4});
            else console.log("Sending all products");
            console.log(result);
        res.send(result);
        })
    });


    app.get('/product', (req, res) => {
       var product_id = req.query.id;
        var fetchQuery = "SELECT * FROM products WHERE product_id="+product_id.toString();
        connection.query(fetchQuery, function(err, result){
            if(err) res.json({code: -4});
            else console.log("Sending product_id=",product_id);
            console.log(result);
        res.send(result);
        })
    });

    app.get('/index', (req, res) => {
         var fetchQuery = "SELECT product_name,tag_name FROM tags";
         connection.query(fetchQuery, function(err, result){
             if(err) res.json({code: -4});
             console.log(result);
         res.send(result);
         })
     });

     app.post('/callData', (req, res) => {
         var searchData = req.body.products;
         console.log(searchData);
         var data = "( ";
         var data2 = "( product_name, ";
         for(var i=0; i<searchData.length; i++)
         {
            data+= " '" + searchData[i].toLowerCase() + "',";
            data2+= " '" + searchData[i].toLowerCase() + "',";
         }
         data= data.substring(0,data.length-1);
         data2= data2.substring(0,data2.length-1);
         data+= " ) ";
         data2+= " ) ";
         console.log(data2);
         console.log(data);
        var fetchQuery = "SELECT * FROM products WHERE product_name in "+data+" ORDER BY FIELD "+data2;
        console.log(fetchQuery);
        connection.query(fetchQuery, function(err, result){
            if(err) res.json({code: -4});
            console.log(result);
        res.json(result);
        })
    });


  

app.post('/upload', upload.single('photo'), (req, res) => {
    if(req.file) {
        console.log("File received");
        if(req.file.mimetype === 'image/png') ext=".png";
        if(req.file.mimetype === 'image/jpg') ext=".jpg";
        if(req.file.mimetype === 'image/jpeg') ext=".jpeg";
        if(req.file.mimetype === 'image/svg') ext=".svg";
        console.log(req.file.filename.toString() + ext);
        var file_name=req.file.filename.toString();
        res.json({file: file_name, status: 200});
    }
    else 
    {
        res.json({status: 2});
        throw 'error';
    }
});

app.post('/avatar', upload.single('photo'), (req, res) => {
    if(req.file) {
        res.json(req.file);
    }
    else throw 'error';
});

 app.post('/addProduct', (req, res) => {
console.log("Add Product called!");
console.log(req.body);
    product_name = req.body.name;
    product_price = req.body.price;
    product_description = req.body.des;
    product_mrp = req.body.mrp;
    product_image = req.body.image;
    product_tags = req.body.index;
    product_category = req.body.category;
    var auth_token = req.headers.authorization;
    console.log("This is the received token: ", auth_token);
    if (!auth_token) {
          return res.json({
            message: "No token provided!",
            code: 55
          });
        }
    else 
    {
        jwt.verify(auth_token, secret, function(err, decoded) {
            if(err) res.json({code: 55});
            else
            {
            console.log(decoded);
            var email = decoded.posted_email.toString();
            checkQuery = "INSERT into products (user_email, product_name,product_price, product_mrp, product_description, category,product_image) VALUES('" + email +"','" + product_name  +"','" + product_price +"','" + product_mrp+"','" + product_description +"', '"+ product_category + "','" + product_image + "')";
            console.log(checkQuery);
        connection.query(checkQuery, function(err, result){
            if(err) res.json({code: -4});
            else if(result) 
            {
                var data_list = ""
                for(var i=0; i<product_tags.length;i++)
                {     
                    data_item = " ('" + product_name + "' , '" + product_tags[i] + "'),";
                    data_list += data_item;
                }
                data_list = data_list.substring(0,data_list.length-1);
                insertTagsQuery = "INSERT into tags (product_name,tag_name) VALUES " + data_list.toString();
                console.log(insertTagsQuery);
            connection.query(insertTagsQuery, function(errors, results){
                if(errors) res.json({code: -4});
                else if(results) res.json({code: 200});
          });
    }
})
    }


      });
    }
});

      app.post('/editProduct', (req, res) => {
        console.log("Edit Product called!");
        console.log(req.body);
            product_name = req.body.name;
            product_price = req.body.price;
            product_description = req.body.des;
            product_mrp = req.body.mrp;
            product_image = req.body.image;
            product_id = req.body.id;
            var auth_token = req.headers.authorization;
            console.log("This is the received token: ", auth_token);
            if (!auth_token) {
                  return res.json({
                    message: "No token provided!",
                    code: 55,
                  });
                }
            else 
            {
                jwt.verify(auth_token, secret, function(err, decoded) {
                    if(err) res.json({code: 55});
                    else
                    {
                    console.log(decoded);
                    var email = decoded.posted_email.toString();
                    checkQuery = "UPDATE products SET product_name='"+ product_name +"', product_price='"+ product_price +"', product_mrp='"+ product_mrp +"', product_description='"+ product_description +"', product_image='"+ product_image +"' WHERE product_id="+product_id;
                    console.log(checkQuery);
                connection.query(checkQuery, function(err, result){
                    if(err) res.json({code: -4});
                    else if(result) 
                    {
                        res.json({code: 200});
                    }
                if(err) res.json({code: -4});
                  });
               
            }
        })
            }
        
        
              });

              app.post('/delete', (req, res) => {
                console.log("Delete called!");
                console.log(req.body);
                    id = req.body.id;
                    var auth_token = req.headers.authorization;
                    console.log("This is the received token: ", auth_token);
                    if (!auth_token) {
                          return res.json({
                            message: "No token provided!",
                            code: 55
                          });
                        }
                    else 
                    {
                        jwt.verify(auth_token, secret, function(err, decoded) {
                            if(err) res.json({code: 55});
                            else
                            {
                            console.log(decoded);
                            checkQuery = "DELETE FROM products WHERE product_id="+ id;
                            console.log(checkQuery);
                        connection.query(checkQuery, function(err, result){
                            if(err) res.json({code: -4});
                            else if(result) 
                            {
                                res.json({code: 200});
                            }
                        if(err) res.json({code: -4});
                          });
                       
                    }
                })
                    }
                });

                app.get('/verify', (req, res) => {
                    console.log("Verify called!");
                        var auth_token = req.headers.authorization;
                        console.log("This is the received token: ", auth_token);
                        if (!auth_token) {
                              res.json({code: 55});
                            }
                        else 
                        {
                            jwt.verify(auth_token, secret, function(err, decoded) {
                                if(err) res.json({code: 55});
                                else
                                {
                                res.json({code: 200});
                                console.log("Marked as Verified: ",decoded);
                        }
                    })
                        }
                    });

    
app.listen(port, ()=> {console.log("Server started & running on port: "+port)});