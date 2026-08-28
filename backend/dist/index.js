import ka from"dotenv";import se from"express";import Ha from"cors";import Ba from"node-cron";import K from"path";import Va from"open";import _a from"express";import ca from"mysql";import da from"dotenv";import te from"path";var ua=typeof process.pkg<"u",la=ua?te.dirname(process.execPath):process.cwd();da.config({path:te.join(la,".env")});var Z=ca.createPool({connectionLimit:20,connectTimeout:4e4,acquireTimeout:4e4,timeout:4e4,host:process.env.DB_HOST||"gateway01.us-east-1.prod.aws.tidbcloud.com",user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME||"sistema",port:4e3,ssl:{rejectUnauthorized:!0,minVersion:"TLSv1.2"},timezone:"-04:00",dateStrings:!0});Z.on("connection",o=>{o.query("SET time_zone = '-04:00';",e=>{e&&console.error("\u26A0\uFE0F Error al forzar zona horaria:",e.message)})});Z.getConnection((o,e)=>{o?console.error("\u274C Error connecting to MySQL:",o.message):(console.log("\u2705 Connected to TiDB database!"),e.release())});var g=Z;import re from"bcrypt";import pa from"jsonwebtoken";var ne=(o,e)=>{let a=o.body.usuario||o.body.username,s=o.body.contrasena||o.body.password;if(!a||!s)return e.status(400).json({message:"El usuario y la contrase\xF1a son obligatorios."});g.query(`
        SELECT u.*, e.nom_emp, e.ape_emp, s.nombre as nombre_sucursal
        FROM usuarios u 
        LEFT JOIN empleados e ON u.emp_usu = e.id_emp 
        LEFT JOIN sucursales s ON u.id_sucursal = s.id_sucursal
        WHERE u.usuario = ?
    `,[a],async(r,i)=>{if(r)return e.status(500).json({message:"Error de conexi\xF3n con la base de datos."});if(i.length===0)return e.status(401).json({message:"El usuario ingresado no existe."});let n=i[0];if(n.estatus==="INACTIVO")return e.status(403).json({message:"Este usuario se encuentra deshabilitado. Contacte al administrador."});try{let d=!1;if(n.contra_hash&&n.contra_hash.startsWith("$2b$"))d=await re.compare(s,n.contra_hash);else if(d=s===n.contra_hash,d){let l=await re.hash(s,10);g.query("UPDATE usuarios SET contra_hash = ? WHERE id_usu = ?",[l,n.id_usu])}if(!d)return e.status(401).json({message:"Contrase\xF1a incorrecta."});let u=process.env.JWT_SECRET;if(!u)return console.error("Falta configurar JWT_SECRET en las variables de entorno para el Login."),e.status(500).json({message:"Error interno de configuraci\xF3n del servidor."});let _=pa.sign({id_usu:n.id_usu,rol_usu:n.rol_usu,id_sucursal:n.id_sucursal},u,{expiresIn:"12h"});g.query("INSERT INTO bitacora_auditoria (id_usuario, accion, modulo, descripcion) VALUES (?, 'LOGIN', 'ACCESO', 'Inicio de sesi\xF3n exitoso')",[n.id_usu]),g.query("UPDATE usuarios SET ultimo_login = NOW() WHERE id_usu = ?",[n.id_usu]),g.query(`
                SELECT p.cod_permiso 
                FROM permisos p 
                INNER JOIN permisos_usuario pu ON p.id_permiso = pu.id_permiso 
                WHERE pu.id_usu = ?
            `,[n.id_usu],(l,E)=>{if(l)return e.status(500).json({message:"Error al obtener permisos"});let R=E.map(f=>f.cod_permiso),v=n.nom_emp&&n.ape_emp?`${n.nom_emp} ${n.ape_emp}`:n.usuario;e.status(200).json({message:"Login exitoso",token:_,usuario:{id_usu:n.id_usu,usuario:n.usuario,rol_usu:n.rol_usu,id_sucursal:n.id_sucursal,nombre_sucursal:n.nombre_sucursal||"Sede Principal",nombre:v},permisos:R})})}catch{e.status(500).json({message:"Error interno procesando la seguridad."})}})};var ie=_a.Router();ie.post("/login",ne);var ce=ie;import Ea from"express";var w=(o,e)=>new Promise((a,s)=>g.query(o,e,(t,r)=>t?s(t):a(r))),de=(o,e)=>{let a=Date.now().toString().slice(-8),s=o.toString().padStart(3,"0").slice(-3),t=e.toString().padStart(1,"0").slice(-1);return`2${a}${s}${t}`},ue=(o,e,a)=>{if(!o||o.trim().length<3)return"El nombre base del producto debe tener al menos 3 letras.";if(Number(e)<0)return"El margen de ganancia no puede ser negativo.";if(a&&a.length>0)for(let s of a){if(Number(s.costo_usd)<0||Number(s.precio_venta_usd)<0)return"Los costos y precios no pueden ser negativos.";if(Number(s.stock)<0)return"El stock inicial no puede ser negativo."}return null},le=async(o,e)=>{let a=o.user?.id_sucursal||1;try{let t=await w(`
            SELECT p.*, 
                   c.descrip_categ as categoria, 
                   GROUP_CONCAT(pr.codigo_barras SEPARATOR ', ') as codigos_sku,
                   GROUP_CONCAT(
                       CONCAT(
                           IFNULL(pr.id_presentacion, 0), '::', 
                           IFNULL(NULLIF(TRIM(pr.talla), ''), 'N/A'), '::', 
                           IFNULL(NULLIF(TRIM(pr.color), ''), 'N/A'), '::', 
                           IFNULL(pr.precio_venta_usd, 0), '::', 
                           IFNULL(inv.stock, 0)
                       ) SEPARATOR '||'
                   ) as lista_variantes,
                   SUM(IFNULL(inv.stock, 0)) as stock_total_sucursal
            FROM productos p
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            JOIN presentaciones_producto pr ON p.id_prod = pr.id_producto
            JOIN inventario_sucursales inv ON pr.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
            GROUP BY p.id_prod, c.descrip_categ
            ORDER BY p.id_prod DESC
        `,[a]);e.status(200).json(t)}catch(s){console.error(s),e.status(500).json({message:"Error al obtener productos."})}},pe=async(o,e)=>{let{nombre_base:a,categ_prod:s,margen_ganancia:t,presentaciones:r,usa_margen_categoria:i}=o.body,n=o.user?.id_sucursal||1,d=ue(a,t,r);if(d)return e.status(400).json({message:d});if(r&&r.length>0){let u=r.map(_=>_.codigo_barras?.trim()).filter(_=>_&&_!=="");if(u.length>0)try{let m=await w("SELECT codigo_barras FROM presentaciones_producto WHERE codigo_barras IN (?) LIMIT 1",[u]);if(m.length>0)return e.status(400).json({message:`El SKU/C\xF3digo de barras '${m[0].codigo_barras}' ya est\xE1 siendo utilizado por otro producto en el inventario.`})}catch(_){return console.error("Error validando SKUs en creaci\xF3n:",_),e.status(500).json({message:"Error interno validando los c\xF3digos SKU."})}}g.getConnection(async(u,_)=>{if(u)return e.status(500).json({message:"Error de conexi\xF3n."});let m=(l,E)=>new Promise((R,v)=>_.query(l,E,(f,c)=>f?v(f):R(c)));try{await new Promise((v,f)=>_.beginTransaction(c=>c?f(c):v()));let R=(await m("INSERT INTO productos (nombre_base, categ_prod, margen_ganancia, usa_margen_categoria) VALUES (?, ?, ?, ?)",[a,s||null,t,i?1:0])).insertId;if(r&&r.length>0)for(let[v,f]of r.entries()){let c=f.codigo_barras&&f.codigo_barras.trim()!==""?f.codigo_barras.trim():de(R,v),O=await m(`
                        INSERT INTO presentaciones_producto 
                          (id_producto, codigo_barras, talla, color, costo_usd, precio_venta_usd, cant_minima_mayor, punto_reorden) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `,[R,c,f.talla||null,f.color||null,f.costo_usd||0,f.precio_venta_usd||0,f.cant_minima_mayor||0,f.punto_reorden||0]);await m("INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) VALUES (?, ?, ?)",[O.insertId,n,f.stock||0])}await new Promise((v,f)=>_.commit(c=>c?f(c):v())),e.status(201).json({message:"Producto y variantes creados"})}catch(l){_.rollback(),console.error(l),e.status(500).json({message:"Error al registrar."})}finally{_.release()}})},_e=async(o,e)=>{let a=o.params.id,{presentaciones:s,usa_margen_categoria:t}=o.body,r=o.body.nombre_base,i=o.body.categ_prod||null,n=Number(o.body.margen_ganancia)||0,d=t?1:0,u=o.user?.id_sucursal||1,_=ue(r,n,s);if(_)return e.status(400).json({message:_});if(s&&s.length>0){let m=s.map(l=>l.codigo_barras?.trim()).filter(l=>l&&l!=="");if(m.length>0)try{let E=await w("SELECT codigo_barras FROM presentaciones_producto WHERE codigo_barras IN (?) AND id_producto != ? LIMIT 1",[m,a]);if(E.length>0)return e.status(400).json({message:`El SKU/C\xF3digo '${E[0].codigo_barras}' no puede usarse porque ya pertenece a otro producto distinto.`})}catch(l){return console.error("Error validando SKUs en actualizaci\xF3n:",l),e.status(500).json({message:"Error interno validando los c\xF3digos SKU."})}}g.getConnection(async(m,l)=>{if(m)return e.status(500).json({message:"Error de conexi\xF3n."});let E=(R,v)=>new Promise((f,c)=>l.query(R,v,(T,O)=>T?c(T):f(O)));try{if(await new Promise((v,f)=>l.beginTransaction(c=>c?f(c):v())),await E("UPDATE productos SET nombre_base = ?, categ_prod = ?, margen_ganancia = ?, usa_margen_categoria = ? WHERE id_prod = ?",[r,i,n,d,a]),s&&s.length>0){let v=s.filter(f=>f.id_presentacion).map(f=>f.id_presentacion);v.length>0?await E("DELETE FROM presentaciones_producto WHERE id_producto = ? AND id_presentacion NOT IN (?)",[a,v]):await E("DELETE FROM presentaciones_producto WHERE id_producto = ?",[a]);for(let[f,c]of s.entries()){let T=Number(c.costo_usd)||0,O=n<100?T/(1-n/100):T+T*(n/100),C=c.codigo_barras&&c.codigo_barras.trim()!==""?c.codigo_barras.trim():de(a,f);if(c.id_presentacion)await E(`
                            UPDATE presentaciones_producto 
                              SET talla = ?, color = ?, codigo_barras = ?, costo_usd = ?, precio_venta_usd = ?, 
                                  cant_minima_mayor = ?, punto_reorden = ? 
                              WHERE id_presentacion = ?
                        `,[c.talla||null,c.color||null,C,T,O,c.cant_minima_mayor||0,c.punto_reorden||0,c.id_presentacion]),await E("INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE stock = ?",[c.id_presentacion,u,Number(c.stock)||0,Number(c.stock)||0]);else{let L=await E(`
                            INSERT INTO presentaciones_producto 
                              (id_producto, talla, color, codigo_barras, costo_usd, precio_venta_usd, cant_minima_mayor, punto_reorden) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `,[a,c.talla||null,c.color||null,C,T,O,c.cant_minima_mayor||0,c.punto_reorden||0]);await E("INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) VALUES (?, ?, ?)",[L.insertId,u,Number(c.stock)||0])}}}await new Promise((v,f)=>l.commit(c=>c?f(c):v())),e.status(200).json({message:"\xA1Producto actualizado correctamente!"})}catch(R){if(l.rollback(),console.error(R),R.code==="ER_ROW_IS_REFERENCED_2")return e.status(400).json({message:"No puedes eliminar una variante con ventas registradas."});e.status(500).json({message:"Error interno al actualizar el producto."})}finally{l.release()}})},me=async(o,e)=>{try{await w("DELETE FROM presentaciones_producto WHERE id_producto = ?",[o.params.id]),await w("DELETE FROM productos WHERE id_prod = ?",[o.params.id]),e.status(200).json({message:"Producto eliminado exitosamente."})}catch{e.status(400).json({message:"No puedes eliminar este producto porque ya tiene ventas registradas."})}},Ee=async(o,e)=>{let a=o.user?.id_sucursal||1;try{let t=await w(`
            SELECT pp.*, inv.stock
            FROM presentaciones_producto pp
            JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
            WHERE pp.id_producto = ?
        `,[a,o.params.id]);e.status(200).json(t)}catch{e.status(500).json({message:"Error al consultar presentaciones."})}},ge=async(o,e)=>{let{q:a}=o.query,s=o.user?.id_sucursal||1,t=`
        SELECT pp.id_presentacion, p.id_prod, p.nombre_base, pp.talla, pp.color, 
               pp.costo_usd, pp.precio_venta_usd, 
               pp.cant_minima_mayor, 
               inv.stock as stock_sucursal
        FROM presentaciones_producto pp
        JOIN productos p ON pp.id_producto = p.id_prod
        JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
        WHERE (pp.codigo_barras = ? OR p.nombre_base LIKE ?) LIMIT 15
    `;try{let r=await w(t,[s,a,`%${a}%`]);e.status(200).json(r)}catch{e.status(500).json({message:"Error en la b\xFAsqueda."})}};import ma from"jsonwebtoken";var p=(o,e,a)=>{let s,t=o.headers.authorization;if(t?s=t.split(" ")[1]:o.query.token&&(s=o.query.token),!s)return e.status(403).json({message:"Acceso denegado: No se proporcion\xF3 un token."});let r=process.env.JWT_SECRET;if(!r)return console.error("\u{1F6A8} CR\xCDTICO: Falta configurar JWT_SECRET en las variables de entorno."),e.status(500).json({message:"Error interno de configuraci\xF3n del servidor."});ma.verify(s,r,(i,n)=>{if(i)return e.status(401).json({message:"Token inv\xE1lido o expirado. Inicie sesi\xF3n nuevamente."});o.user=n,a()})},N=o=>(e,a,s)=>{if(e.user&&e.user.rol_usu===1)return s();g.query(`
            SELECT 1 
            FROM permisos_usuario pu
            JOIN permisos p ON pu.id_permiso = p.id_permiso
            WHERE pu.id_usu = ? AND p.cod_permiso = ?
        `,[e.user.id_usu,o],(r,i)=>r?a.status(500).json({message:"Error interno verificando permisos"}):i.length>0?s():a.status(403).json({message:`Prohibido: No tienes el permiso (${o}) para realizar esta acci\xF3n.`}))};var j=Ea.Router();j.get("/",p,N("OBTENER_PRODUCTOS"),le);j.post("/",p,N("CREAR_PRODUCTO"),pe);j.get("/buscar",p,N("BUSCAR_PRODUCTO"),ge);j.delete("/:id",p,N("ELIMINAR_PRODUCTO"),me);j.get("/:id/presentaciones",p,N("OBTENER_PRESENTACIONES"),Ee);j.put("/:id",p,N("ACTUALIZAR_PRODUCTO"),_e);var ve=j;import ga from"express";var J=(o,e)=>new Promise((a,s)=>{g.query(o,e,(t,r)=>{t?s(t):a(r)})}),fe=async(o,e)=>{let a=`
        SELECT 
            c.id_cli, c.ced_rif_cli, c.ra_soc_cli, c.num_tlf_cli,
            c.tipo_doc_cli, c.pref_tlf_cli, n.letra_tipo, p.pref_tlf
        FROM clientes c
        LEFT JOIN tipos_documento n ON c.tipo_doc_cli = n.id_tipo
        LEFT JOIN prefijos_telefono p ON c.pref_tlf_cli = p.id_pref
        WHERE c.id_cli != 1
        ORDER BY c.id_cli DESC
    `;try{let s=await J(a,[]);e.status(200).json(s)}catch(s){console.error("Error al consultar clientes:",s),e.status(500).json({message:"Error en la base de datos."})}},Re=(o,e,a)=>!o||o.length<6||o.length>10||!/^\d+$/.test(o)?"La C\xE9dula/RIF debe tener entre 6 y 10 n\xFAmeros, sin letras.":!e||e.trim().length<3?"La raz\xF3n social debe tener al menos 3 caracteres.":a&&(a.length!==7||!/^\d+$/.test(a))?"El tel\xE9fono debe tener exactamente 7 d\xEDgitos num\xE9ricos.":null,Ne=async(o,e)=>{let{nacionalidad_cli:a,ced_rif_cli:s,ra_soc_cli:t,prefijo_tlf_cli:r,num_tlf_cli:i}=o.body,n=Re(s,t,i);if(n)return e.status(400).json({message:n});let d=`
        INSERT INTO clientes (tipo_doc_cli, ced_rif_cli, ra_soc_cli, pref_tlf_cli, num_tlf_cli) 
        VALUES (?, ?, ?, ?, ?)
    `,u=[a,s,t,r,i];try{let _=await J(d,u);e.status(201).json({message:"Cliente registrado exitosamente.",id_cli:_.insertId,tipo_doc_cli:a,ced_rif_cli:s,ra_soc_cli:t,pref_tlf_cli:r,num_tlf_cli:i})}catch(_){if(console.error("Error al insertar cliente:",_),_.code==="ER_DUP_ENTRY")return e.status(400).json({message:"Ya existe un cliente con esta C\xE9dula o RIF."});e.status(500).json({message:"Error interno del servidor."})}},Te=async(o,e)=>{let{id:a}=o.params;if(a==1)return e.status(403).json({message:"Acceso denegado: No se puede eliminar el cliente de uso interno."});try{await J("DELETE FROM clientes WHERE id_cli = ?",[a]),e.status(200).json({message:"Cliente eliminado exitosamente."})}catch(s){if(s.code==="ER_ROW_IS_REFERENCED_2"||s.errno===1451)return e.status(400).json({message:"No puedes eliminar este cliente porque tiene documentos registrados en el sistema."});console.error("Error al eliminar cliente:",s),e.status(500).json({message:"Error interno del servidor al intentar eliminar el registro."})}},Oe=(o,e)=>{let{id:a}=o.params;g.query("SELECT SUM(monto_usd) as saldo FROM notas_credito WHERE id_cliente = ? AND estado = 'DISPONIBLE'",[a],(t,r)=>{if(t)return e.status(500).json({message:"Error al obtener saldo.",error:t});e.json({saldo:r[0].saldo||0})})},be=async(o,e)=>{let{id:a}=o.params;if(a==1)return e.status(403).json({message:"Acceso denegado: No se puede editar el cliente interno."});let{nacionalidad_cli:s,ced_rif_cli:t,ra_soc_cli:r,prefijo_tlf_cli:i,num_tlf_cli:n}=o.body,d=Re(t,r,n);if(d)return e.status(400).json({message:d});let u=`
        UPDATE clientes
        SET tipo_doc_cli = ?, ced_rif_cli = ?, ra_soc_cli = ?, pref_tlf_cli = ?, num_tlf_cli = ?
        WHERE id_cli = ?
    `,_=[s,t,r,i,n,a];try{if((await J(u,_)).affectedRows===0)return e.status(404).json({message:"Cliente no encontrado."});e.status(200).json({message:"Cliente actualizado exitosamente."})}catch(m){if(console.error("Error al actualizar cliente:",m),m.code==="ER_DUP_ENTRY")return e.status(400).json({message:"Ya existe otro cliente con esta C\xE9dula o RIF."});e.status(500).json({message:"Error interno del servidor."})}};var F=ga.Router();F.get("/",p,N("OBTENER_CLIENTES"),fe);F.post("/",p,N("CREAR_CLIENTE"),Ne);F.delete("/:id",p,N("ELIMINAR_CLIENTE"),Te);F.put("/:id",p,N("ACTUALIZAR_CLIENTE"),be);F.get("/:id/saldo",p,Oe);var Se=F;import va from"express";var Ie=(o,e)=>{g.query("SELECT * FROM tipos_documento ORDER BY id_tipo ASC",(s,t)=>{if(s)return console.error("Error al consultar nacionalidades:",s),e.status(500).json({message:"Error en la base de datos."});e.status(200).json(t)})};var Ce=va.Router();Ce.get("/",p,Ie);var ye=Ce;import fa from"express";var Le=(o,e)=>{g.query("SELECT * FROM categorias_producto",(s,t)=>{if(s)return e.status(500).json({message:"Error obteniendo categor\xEDas"});e.json(t)})},he=(o,e)=>{let{descrip_categ:a,margen_ganancia_defecto:s}=o.body,t=s!==""&&s!==null&&s!==void 0?parseFloat(s):null;g.query("INSERT INTO categorias_producto (descrip_categ, margen_ganancia_defecto) VALUES (?, ?)",[a,t],(i,n)=>{if(i)return e.status(500).json({message:"Error creando categor\xEDa",error:i.message});e.status(201).json({id_categ:n.insertId,descrip_categ:a,margen_ganancia_defecto:t})})},Pe=(o,e)=>{let{id:a}=o.params,{descrip_categ:s,margen_ganancia_defecto:t}=o.body,r=t!==""&&t!==null&&t!==void 0?parseFloat(t):null;g.getConnection(async(i,n)=>{if(i)return e.status(500).json({message:"Error de conexi\xF3n."});let d=(u,_)=>new Promise((m,l)=>{n.query(u,_,(E,R)=>E?l(E):m(R))});try{await new Promise((u,_)=>n.beginTransaction(m=>m?_(m):u())),await d("UPDATE categorias_producto SET descrip_categ = ?, margen_ganancia_defecto = ? WHERE id_categ = ?",[s,r,a]),r!==null&&(await d("UPDATE productos SET margen_ganancia = ? WHERE categ_prod = ? AND usa_margen_categoria = 1",[r,a]),await d(`
                    UPDATE presentaciones_producto pp
                    JOIN productos p ON pp.id_producto = p.id_prod
                    SET pp.precio_venta_usd = IF(
                        p.margen_ganancia < 100,
                        pp.costo_usd / (1 - (p.margen_ganancia / 100)),
                        pp.costo_usd + (pp.costo_usd * (p.margen_ganancia / 100))
                    )
                    WHERE p.categ_prod = ? AND p.usa_margen_categoria = 1
                `,[a])),await new Promise((u,_)=>n.commit(m=>m?_(m):u())),e.json({message:"Categor\xEDa actualizada y precios recalculados exitosamente."})}catch(u){n.rollback(),e.status(500).json({message:"Error actualizando categor\xEDa",error:u.message})}finally{n.release()}})},De=(o,e)=>{let{id:a}=o.params;g.query("DELETE FROM categorias_producto WHERE id_categ = ?",[a],(t,r)=>{if(t)return t.errno===1451?e.status(400).json({message:"No puedes eliminar esta categor\xEDa porque ya tiene productos asignados a ella."}):e.status(500).json({message:"Error eliminando categor\xEDa",error:t.message});e.json({message:"Categor\xEDa eliminada"})})};var M=fa.Router();M.get("/",p,N("OBTENER_CATEGORIAS"),Le);M.post("/",p,he);M.put("/:id",p,Pe);M.delete("/:id",p,De);var Ae=M;import Ra from"express";var we=(o,e)=>{g.query("SELECT * FROM unidades ORDER BY id_unidad ASC",(s,t)=>{if(s)return console.error("Error al consultar unidades:",s),e.status(500).json({message:"Error en la base de datos."});e.status(200).json(t)})};var je=Ra.Router();je.get("/",p,we);var Ue=je;import Na from"express";var Fe=(o,e)=>{g.query("SELECT * FROM prefijos_telefono ORDER BY id_pref ASC",(s,t)=>{if(s)return console.error("Error al consultar prefijos:",s),e.status(500).json({message:"Error en la base de datos."});e.status(200).json(t)})};var qe=Na.Router();qe.get("/",p,Fe);var xe=qe;import Ta from"express";var Y=(o,e)=>new Promise((a,s)=>{g.query(o,e,(t,r)=>{t?s(t):a(r)})}),Me=async(o,e)=>{let a=`
        SELECT 
        p.id_prov, p.nombre
        FROM proveedores p
        ORDER BY p.id_prov DESC
    `;try{let s=await Y(a,[]);e.status(200).json(s)}catch(s){console.error("Error al consultar proveedores:",s),e.status(500).json({message:"Error en la base de datos."})}},We=o=>!o||o.trim().length<3?"El nombre debe tener al menos 3 caracteres.":null,ke=async(o,e)=>{let{nombre:a}=o.body,s=We(a);if(s)return e.status(400).json({message:s});let t=`
        INSERT INTO proveedores (nombre) 
        VALUES (?)
    `,r=[a];try{let i=await Y(t,r);e.status(201).json({message:"Proveedor registrado exitosamente.",id_prov:i.insertId,nombre:a})}catch(i){console.error("Error al insertar proveedor:",i),e.status(500).json({message:"Error interno del servidor."})}},He=async(o,e)=>{let{id:a}=o.params;try{await Y("DELETE FROM proveedores WHERE id_prov = ?",[a]),e.status(200).json({message:"Proveedor eliminado exitosamente."})}catch(s){if(s.code==="ER_ROW_IS_REFERENCED_2"||s.errno===1451)return e.status(400).json({message:"No puedes eliminar este proveedor porque tiene productos asociados en el sistema."});console.error("Error al eliminar proveedor:",s),e.status(500).json({message:"Error interno del servidor al intentar eliminar el registro."})}},Be=async(o,e)=>{let{id:a}=o.params,{nombre:s}=o.body,t=We(s);if(t)return e.status(400).json({message:t});let r=`
        UPDATE proveedores
        SET nombre = ?
        WHERE id_prov = ?
    `,i=[s,a];try{if((await Y(r,i)).affectedRows===0)return e.status(404).json({message:"Proveedor no encontrado."});e.status(200).json({message:"Proveedor actualizado exitosamente."})}catch(n){console.error("Error al actualizar proveedor:",n),e.status(500).json({message:"Error interno del servidor."})}};var W=Ta.Router();W.get("/",p,N("OBTENER_PROVEEDORES"),Me);W.post("/",p,N("CREAR_PROVEEDOR"),ke);W.delete("/:id",p,N("ELIMINAR_PROVEEDOR"),He);W.put("/:id",p,N("ACTUALIZAR_PROVEEDOR"),Be);var Ve=W;import Ca from"express";import ze from"axios";import*as Je from"cheerio";import Oa from"https";var $e=(o,e)=>new Promise((a,s)=>{g.query(o,e,(t,r)=>{t?s(t):a(r)})}),ba=new Oa.Agent({rejectUnauthorized:!1}),Sa=async()=>{try{let o=await ze.get("https://www.bcv.org.ve/",{httpsAgent:ba,timeout:15e3,headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}}),a=Je.load(o.data)("#dolar strong").text().replace(",",".").trim(),s=parseFloat(a);if(isNaN(s))throw new Error("No se pudo parsear el valor del BCV");let t=await ze.get("https://api.exchangerate-api.com/v4/latest/USD"),r=parseFloat(t.data.rates.COP);return{bcv:s,cop:r}}catch(o){throw console.error("Error detallado al obtener tasas:",o.message),new Error("No se pudo conectar con los servicios de tasas externas (Error de Certificado/Red).")}},Q=async()=>{try{let o=await $e("SELECT tasa_bcv, tasa_cop FROM configuracion WHERE id_config = 1");if(!o||o.length===0)throw new Error("No se encontr\xF3 la configuraci\xF3n en la base de datos.");let e=parseFloat(o[0].tasa_bcv),a=parseFloat(o[0].tasa_cop),s=await Sa(),t=s.bcv>e?s.bcv:e,r=s.cop>a?s.cop:a;return t>e||r>a?(await $e("UPDATE configuracion SET tasa_bcv = ?, tasa_cop = ? WHERE id_config = 1",[t,r]),{bcv:t,cop:r,actualizado:!0}):{bcv:e,cop:a,actualizado:!1}}catch(o){throw console.error("Error en actualizarTodasLasTasas:",o),o}},Ye=(o,e)=>{g.query("SELECT tasa_bcv, tasa_cop, backup_activo, monto_mora FROM configuracion LIMIT 1",(s,t)=>{if(s)return e.status(500).json({message:"Error al obtener la configuraci\xF3n"});e.json(t[0]||{tasa_bcv:1,tasa_cop:1,monto_mora:3})})},Ge=async(o,e)=>{try{let a=await Q();a.actualizado?e.json({message:"Tasas incrementadas con \xE9xito",data:a}):e.json({message:"Las tasas externas no han superado a las actuales. No se realizaron cambios.",data:a})}catch(a){console.error("Error en sincronizaci\xF3n manual:",a),e.status(500).json({message:"Error al sincronizar tasas"})}},Ke=(o,e)=>{let{tasa_bcv:a,tasa_cop:s}=o.body;g.query("UPDATE configuracion SET tasa_bcv = ?, tasa_cop = ?, ultima_actualizacion = NOW()",[a,s],(r,i)=>{if(r)return e.status(500).json({message:"Error al guardar las tasas manualmente."});e.status(200).json({message:"Tasas actualizadas correctamente."})})},Ze=(o,e)=>{let{monto_mora:a}=o.body;g.getConnection(async(s,t)=>{if(s)return e.status(500).json({message:"Error de conexi\xF3n."});try{await new Promise((r,i)=>{t.query("UPDATE configuracion SET monto_mora = ?, ultima_actualizacion = NOW() WHERE id_config = 1",[a],n=>n?i(n):r())}),await new Promise((r,i)=>{t.query("UPDATE ventas SET recargo_mora = ? WHERE recargo_mora > 0 AND aplica_mora = 1",[a],n=>n?i(n):r())}),e.status(200).json({message:"Monto actualizado y aplicado a todas las deudas vigentes."})}catch(r){console.error(r),e.status(500).json({message:"Error al actualizar la mora."})}finally{t.release()}})};var k=Ca.Router();k.get("/",p,Ye);k.get("/actualizar-tasas-manual",p,N("SINCRONIZAR_TASAS"),Ge);k.put("/tasas",p,N("CONFIGURAR_TASAS"),Ke);k.put("/mora",p,N("ACTUALIZAR_MORA"),Ze);var Qe=k;import ya from"express";var h=(o,e,a)=>new Promise((s,t)=>{o.query(e,a,(r,i)=>{r?t(r):s(i)})}),Xe=async(o,e)=>{let{id_cliente:a,total_pagado_usd:s,descuento_usd:t=0,items:r,pagos:i,motivo_ajuste:n,aplica_mora:d}=o.body,u=o.user?.id_usu||2,_=o.user?.id_sucursal||1;if(!r||r.length===0)return e.status(400).json({success:!1,message:"La venta debe contener al menos un producto."});if(s<0||t<0)return e.status(400).json({success:!1,message:"Los montos no pueden ser negativos."});g.getConnection(async(m,l)=>{if(m)return e.status(500).json({success:!1,message:"Error de conexi\xF3n a la base de datos."});try{await new Promise((c,T)=>l.beginTransaction(O=>O?T(O):c()));let E=0;for(let c of r){if(c.cantidad<=0)throw new Error("Cantidad inv\xE1lida para el producto.");let O=await h(l,`
                    SELECT pp.precio_venta_usd, IFNULL(inv.stock, 0) as stock_actual
                    FROM presentaciones_producto pp
                    LEFT JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
                    WHERE pp.id_presentacion = ?
                `,[_,c.id_presentacion]);if(O.length===0)throw new Error(`El producto con ID ${c.id_presentacion} no existe.`);let C=O[0].stock_actual,I=O[0].precio_venta_usd;if(c.cantidad>C)throw new Error(`Stock insuficiente. Intentaste vender ${c.cantidad}, pero solo quedan ${C} disponibles.`);E+=c.cantidad*I}let f=(await h(l,`INSERT INTO ventas (id_cliente, fecha, total_pagado, descuento_usd, motivo_ajuste, id_usuario, id_sucursal, recargo_mora, aplica_mora) 
                 VALUES (?, NOW(), ?, ?, ?, ?, ?, 0.00, ?)`,[a,s,t,n,u,_,d===!1?0:1])).insertId;for(let c of r){let O=(await h(l,"SELECT precio_venta_usd FROM presentaciones_producto WHERE id_presentacion = ?",[c.id_presentacion]))[0].precio_venta_usd,C=c.cantidad*O;await h(l,"INSERT INTO detalles_venta (id_venta, id_presentacion, cantidad_vendida, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",[f,c.id_presentacion,c.cantidad,O,C]),await h(l,"UPDATE inventario_sucursales SET stock = stock - ? WHERE id_presentacion = ? AND id_sucursal = ?",[c.cantidad,c.id_presentacion,_])}if(i&&i.length>0)for(let c of i){if(c.monto_usd<=0)throw new Error("El monto de pago no puede ser 0 o negativo.");if(await h(l,"INSERT INTO pagos_venta (id_venta, id_metodo_pago, monto_usd, es_vuelto) VALUES (?, ?, ?, ?)",[f,c.id_metodo,c.monto_usd,c.es_vuelto?1:0]),c.id_metodo===120009&&!c.es_vuelto){let T=Number(c.monto_usd),O=await h(l,`SELECT id_nota, saldo_restante_usd 
                             FROM notas_credito 
                             WHERE id_cliente = ? AND estado = 'DISPONIBLE' 
                             ORDER BY fecha_emision ASC`,[a]),C=O.reduce((I,L)=>I+Number(L.saldo_restante_usd),0);if(C<T)throw new Error(`Fondos insuficientes en Notas de Cr\xE9dito. Dispone de $${C.toFixed(2)}.`);for(let I of O){if(T<=0)break;let L=Number(I.saldo_restante_usd);if(L<=T)T-=L,await h(l,"UPDATE notas_credito SET saldo_restante_usd = 0, estado = 'USADA' WHERE id_nota = ?",[I.id_nota]);else{let D=L-T;T=0,await h(l,"UPDATE notas_credito SET saldo_restante_usd = ? WHERE id_nota = ?",[D,I.id_nota])}}}}await new Promise((c,T)=>l.commit(O=>O?T(O):c())),e.status(201).json({success:!0,id_venta:f,message:"Venta procesada exitosamente."}),l.release()}catch(E){l.rollback(()=>l.release()),e.status(400).json({success:!1,message:E.message||"Ocurri\xF3 un error al procesar la venta."})}})},eo=async(o,e)=>{let a=o.user?.id_sucursal?Number(o.user.id_sucursal):1,s=o.user?.rol_usu?Number(o.user.rol_usu):2,t=o.query.id_sucursal?Number(o.query.id_sucursal):null,r=`
        SELECT v.id_venta, v.fecha, v.total_pagado, v.descuento_usd, v.motivo_ajuste,
                c.ra_soc_cli as cliente, c.ced_rif_cli,
                CONCAT(e.nom_emp, ' ', e.ape_emp) AS operador,
               s.nombre as sucursal
        FROM ventas v 
        LEFT JOIN clientes c ON v.id_cliente = c.id_cli 
        LEFT JOIN usuarios u ON v.id_usuario = u.id_usu
        LEFT JOIN empleados e ON u.emp_usu = e.id_emp
        LEFT JOIN sucursales s ON v.id_sucursal = s.id_sucursal
        WHERE v.id_cliente != 1
    `,i=[];s===1&&t?(r+=" AND v.id_sucursal = ?",i.push(t)):(r+=" AND v.id_sucursal = ?",i.push(a)),r+=" ORDER BY v.fecha DESC LIMIT 150",g.query(r,i,(n,d)=>{if(n)return e.status(500).json({message:"Error al consultar ventas."});e.status(200).json(d)})},oo=async(o,e)=>{let{id:a}=o.params;try{let s=`
            SELECT v.id_venta, v.id_cliente, v.fecha, v.total_pagado, v.descuento_usd, v.recargo_mora,
            c.ra_soc_cli as cliente, c.ced_rif_cli,
            CONCAT(e.nom_emp, ' ', e.ape_emp) AS operador,
            s.nombre as sucursal
    FROM ventas v
            LEFT JOIN clientes c ON v.id_cliente = c.id_cli 
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usu
            LEFT JOIN empleados e ON u.emp_usu = e.id_emp
            LEFT JOIN sucursales s ON v.id_sucursal = s.id_sucursal
            WHERE v.id_venta = ?`,t=`
    SELECT dv.id_presentacion, dv.cantidad_vendida as cantidad, dv.precio_unitario, dv.subtotal,
            dv.cantidad_devuelta, p.nombre_base 
    FROM detalles_venta dv
    JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
    JOIN productos p ON pp.id_producto = p.id_prod
    WHERE dv.id_venta = ?`,r=`
            SELECT pv.monto_usd, pv.es_vuelto, mp.descripcion as metodo
            FROM pagos_venta pv
            JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
            WHERE pv.id_venta = ?`;g.query(s,[a],(i,n)=>{if(i||n.length===0)return e.status(404).json({message:"Venta no encontrada"});g.query(t,[a],(d,u)=>{if(d)return e.status(500).json({message:"Error al obtener detalles"});g.query(r,[a],(_,m)=>{if(_)return e.status(500).json({message:"Error al obtener pagos"});e.status(200).json({...n[0],items:u,pagos:m})})})})}catch{e.status(500).json({message:"Error interno"})}},ao=async(o,e)=>{try{g.query("SELECT * FROM metodos_pago",(a,s)=>{if(a)return console.error("Error al consultar m\xE9todos de pago:",a),e.status(500).json({message:"Error al obtener los m\xE9todos de pago."});e.status(200).json(s)})}catch(a){console.error("Error interno:",a),e.status(500).json({message:"Error interno al procesar los m\xE9todos de pago."})}},so=async(o,e)=>{let{id_venta:a,id_cliente:s,items_devueltos:t}=o.body,r=o.user?.id_sucursal||1,i=o.user?.id_usu||2;if(!a||!s)return e.status(400).json({success:!1,message:"Faltan datos obligatorios."});if(!t||t.length===0)return e.status(400).json({success:!1,message:"No hay art\xEDculos seleccionados para devolver."});g.getConnection(async(n,d)=>{if(n)return e.status(500).json({success:!1,message:"Error de conexi\xF3n a la base de datos."});try{await new Promise((l,E)=>d.beginTransaction(R=>R?E(R):l()));let u=0;for(let l of t){if(l.cantidad<=0)throw new Error("La cantidad a devolver debe ser mayor a cero.");let R=await h(d,`
                    SELECT id_detalle, cantidad_vendida, precio_unitario, IFNULL(cantidad_devuelta, 0) as cantidad_devuelta 
                     FROM detalles_venta 
                     WHERE id_venta = ? AND id_presentacion = ?
                `,[a,l.id_presentacion]);if(R.length===0)throw new Error("El art\xEDculo seleccionado no pertenece a la venta original.");let{id_detalle:v,cantidad_vendida:f,precio_unitario:c,cantidad_devuelta:T}=R[0],O=f-T;if(l.cantidad>O)throw new Error(`No puedes devolver ${l.cantidad} unidad(es). M\xE1ximo disponible: ${O}.`);let C=l.cantidad*c;u+=C,await h(d,`UPDATE inventario_sucursales 
                      SET stock = stock + ? 
                      WHERE id_presentacion = ? AND id_sucursal = ?`,[l.cantidad,l.id_presentacion,r]),await h(d,`UPDATE detalles_venta 
                      SET cantidad_devuelta = cantidad_devuelta + ? 
                      WHERE id_detalle = ?`,[l.cantidad,v])}let m=(await h(d,`INSERT INTO notas_credito (id_cliente, id_venta_origen, monto_usd, saldo_restante_usd, estado) 
                  VALUES (?, ?, ?, ?, 'DISPONIBLE')`,[s,a,u,u])).insertId;await h(d,`INSERT INTO bitacora_auditoria (id_usuario, accion, modulo, descripcion) 
                 VALUES (?, 'DEVOLUCION', 'INVENTARIO', ?)`,[i,`Reingreso por devoluci\xF3n (Venta #${a}). Se gener\xF3 Nota Cr\xE9dito #${m} por $${u.toFixed(2)}`]),await new Promise((l,E)=>d.commit(R=>R?E(R):l())),e.status(201).json({success:!0,message:"Nota de cr\xE9dito generada de forma exitosa.",id_nota:m,monto_total:u}),d.release()}catch(u){d.rollback(()=>d.release()),e.status(400).json({success:!1,message:u.message||"Ocurri\xF3 un error al procesar la devoluci\xF3n."})}})};var q=ya.Router();q.get("/metodos-pago",p,ao);q.get("/historial",p,eo);q.get("/:id",p,oo);q.post("/",p,N("REGISTRAR_VENTA"),Xe);q.post("/devolucion",p,so);var to=q;import La from"express";var H=(o,e,a)=>new Promise((s,t)=>{o.query(e,a,(r,i)=>{r?t(r):s(i)})}),ro=async(o,e)=>{let{id_prov:a,total_costo_usd:s,items:t}=o.body,r=o.user?.id_usu||o.user?.id,i=o.user?.id_sucursal||1;if(!r)return e.status(401).json({message:"Error: No se pudo identificar al usuario. Inicie sesi\xF3n nuevamente."});if(!t||t.length===0)return e.status(400).json({message:"La entrada debe contener al menos un producto."});if(Number(s)<0)return e.status(400).json({message:"El costo total de la entrada no puede ser negativo."});for(let n of t){if(Number(n.cantidad)<=0)return e.status(400).json({message:"No puedes ingresar un producto con cantidad 0 o negativa."});if(Number(n.costo_unitario_usd)<0)return e.status(400).json({message:"El costo unitario de un producto no puede ser negativo."})}g.getConnection(async(n,d)=>{if(n)return console.error("Error obteniendo conexi\xF3n:",n),e.status(500).json({message:"Error de conexi\xF3n al servidor."});try{await new Promise((v,f)=>{d.beginTransaction(c=>c?f(c):v())});let m=(await H(d,"INSERT INTO entradas_inventario (id_usuario, id_sucursal, id_prov, total_costo_usd, fecha) VALUES (?, ?, ?, ?, NOW())",[r,i,a||null,Number(s)||0])).insertId,l="INSERT INTO detalles_entrada (id_entrada, id_presentacion, id_producto, cantidad_recibida, costo_unitario_usd, subtotal_usd) VALUES ?",E=t.map(v=>[m,v.id_presentacion,v.id_prod||null,Number(v.cantidad),Number(v.costo_unitario_usd)||0,Number(v.cantidad)*(Number(v.costo_unitario_usd)||0)]);await H(d,l,[E]);let R=t.map(async v=>{let f=Number(v.cantidad),c=Number(v.costo_unitario_usd)||0,T=v.id_presentacion;await H(d,`
                    INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) 
                    VALUES (?, ?, ?) 
                    ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)
                `,[T,i,f]),await H(d,`
                    UPDATE presentaciones_producto 
                    SET costo_usd = ?
                    WHERE id_presentacion = ?
                `,[c,T]),await H(d,`
                    UPDATE presentaciones_producto pp
                    JOIN productos p ON pp.id_producto = p.id_prod
                    SET pp.precio_venta_usd = IF(
                        p.margen_ganancia < 100, 
                        ? / (1 - (p.margen_ganancia / 100)), 
                        ? + (? * (p.margen_ganancia / 100))
                    )
                    WHERE pp.id_presentacion = ?
                `,[c,c,c,T])});await Promise.all(R),await new Promise((v,f)=>{d.commit(c=>{c?f(c):v()})}),e.status(201).json({message:"Entrada de inventario procesada con \xE9xito.",id_entrada:m})}catch(u){await new Promise(_=>d.rollback(()=>_())),console.error("Error en la transacci\xF3n de entrada:",u),e.status(500).json({message:"Error al registrar la entrada. Intente de nuevo."})}finally{d.release()}})};var no=La.Router();no.post("/",p,N("REGISTRAR_ENTRADA"),ro);var io=no;import ha from"express";var x=(o,e)=>new Promise((a,s)=>{g.query(o,e,(t,r)=>{t?s(t):a(r)})}),co=async(o,e)=>{try{let a=o.query.sucursal,t=(await x("SELECT monto_mora FROM configuracion WHERE id_config = 1",[]))[0]?.monto_mora||3,r=`
            UPDATE ventas v
            INNER JOIN (
                SELECT id_venta, SUM(subtotal) as total_vendido
                FROM detalles_venta
                GROUP BY id_venta
            ) d ON v.id_venta = d.id_venta
            SET v.recargo_mora = ${t}
            WHERE DATEDIFF(NOW(), v.fecha) > 15
               AND (IFNULL(v.recargo_mora, 0) = 0 OR v.recargo_mora != ${t})
               AND v.id_cliente != 1
               AND v.aplica_mora = 1
               AND IFNULL(v.total_pagado, 0) < (d.total_vendido - IFNULL(v.descuento_usd, 0) - 0.01)
        `;await x(r,[]);let i="v.id_cliente != 1",n=[];a&&a!=="todas"&&(i+=" AND v.id_sucursal = ?",n.push(a));let d=`
            SELECT 
                c.id_cli,
                c.ra_soc_cli,
                c.ced_rif_cli,
                COUNT(v.id_venta) as facturas_pendientes,
                SUM(v.deuda_real) as saldo_pendiente
            FROM clientes c
            INNER JOIN (
                SELECT 
                    v.id_venta, 
                    v.id_cliente,
                    (IFNULL(SUM(dv.subtotal), 0) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0) - IFNULL(v.total_pagado, 0)) as deuda_real
                FROM ventas v
                LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
                WHERE ${i}
                GROUP BY v.id_venta, v.id_cliente, v.descuento_usd, v.recargo_mora, v.total_pagado
                HAVING deuda_real > 0.01
            ) v ON c.id_cli = v.id_cliente
            GROUP BY c.id_cli, c.ra_soc_cli, c.ced_rif_cli
            ORDER BY c.id_cli DESC
        `,u=await x(d,n);e.status(200).json(u)}catch(a){console.error("Error en cobros:",a),e.status(500).json({message:"Error al calcular deudas y moras."})}},uo=async(o,e)=>{let{id_cliente:a}=o.params,s=o.query.sucursal,t="v.id_cliente = ? AND v.id_cliente != 1",r=[a];s&&s!=="todas"&&(t+=" AND v.id_sucursal = ?",r.push(s));let i=`
        SELECT 
            v.id_venta,
            v.fecha,
            v.aplica_mora,
            DATEDIFF(NOW(), v.fecha) as dias_transcurridos,
            IFNULL(v.recargo_mora, 0) as recargo_mora,
            IFNULL(v.descuento_usd, 0) as descuento_usd,
            (IFNULL(SUM(dv.subtotal), 0) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0)) as monto_total,
            IFNULL(v.total_pagado, 0) as monto_pagado,
            (IFNULL(SUM(dv.subtotal), 0) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0) - IFNULL(v.total_pagado, 0)) as deuda_factura
        FROM ventas v
        LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
        WHERE ${t}
        GROUP BY v.id_venta, v.fecha, v.descuento_usd, v.total_pagado, v.recargo_mora
        HAVING deuda_factura > 0.01
        ORDER BY v.fecha DESC
    `;try{let n=await x(i,r);for(let d=0;d<n.length;d++){let u=n[d].id_venta,_=`
                SELECT 
                    dv.cantidad_vendida, 
                    dv.precio_unitario, 
                    dv.subtotal,
                    p.nombre_base
                FROM detalles_venta dv
                JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
                JOIN productos p ON pp.id_producto = p.id_prod
                WHERE dv.id_venta = ?
            `;n[d].detalles=await x(_,[u]);let m=`
                SELECT pv.monto_usd, mp.descripcion 
                FROM pagos_venta pv
                JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
                WHERE pv.id_venta = ?
            `;n[d].pagos=await x(m,[u])}e.status(200).json(n)}catch(n){console.error("Error al consultar facturas:",n),e.status(500).json({message:"Error al consultar facturas detalladas."})}},lo=async(o,e)=>{let{id_venta:a,pagos:s}=o.body,t=s||[{id_metodo:o.body.id_metodo_pago,monto_usd:o.body.monto_usd,es_vuelto:o.body.es_vuelto||!1}];g.getConnection(async(r,i)=>{if(r)return e.status(500).json({message:"Error de conexi\xF3n."});try{await new Promise((E,R)=>i.beginTransaction(v=>v?R(v):E()));let n=`
                SELECT v.id_cliente, (IFNULL((SELECT SUM(subtotal) FROM detalles_venta WHERE id_venta = v.id_venta), 0) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0) - IFNULL(v.total_pagado, 0)) as deuda_restante 
                 FROM ventas v WHERE id_venta = ?
            `,d=await new Promise((E,R)=>i.query(n,[a],(v,f)=>v?R(v):E(f)));if(d.length===0)throw new Error("Venta no encontrada.");let u=Number(d[0].deuda_restante),_=d[0].id_cliente,m=0;for(let E of t)m+=Number(E.monto_usd);if(m>u+.05)throw new Error(`El abono neto ($${m.toFixed(2)}) supera la deuda restante de la factura ($${u.toFixed(2)}). Registre correctamente el vuelto.`);for(let E of t){let R=Number(E.monto_usd),v=E.id_metodo||E.id_metodo_pago;if(R!==0){let f="INSERT INTO pagos_venta (id_venta, id_metodo_pago, monto_usd, es_vuelto) VALUES (?, ?, ?, ?)";if(await new Promise((c,T)=>i.query(f,[a,v,R,E.es_vuelto?1:0],O=>O?T(O):c())),v===120009&&R>0&&!E.es_vuelto){let c=R,T="SELECT id_nota, saldo_restante_usd FROM notas_credito WHERE id_cliente = ? AND estado = 'DISPONIBLE' ORDER BY fecha_emision ASC",O=await new Promise((I,L)=>i.query(T,[_],(D,A)=>D?L(D):I(A))),C=O.reduce((I,L)=>I+Number(L.saldo_restante_usd),0);if(C<c)throw new Error(`Saldo a favor insuficiente. Dispone de $${C.toFixed(2)}.`);for(let I of O){if(c<=0)break;let L=Number(I.saldo_restante_usd);if(L<=c)c-=L,await new Promise((D,A)=>i.query("UPDATE notas_credito SET saldo_restante_usd = 0, estado = 'USADA' WHERE id_nota = ?",[I.id_nota],U=>U?A(U):D()));else{let D=L-c;c=0,await new Promise((A,U)=>i.query("UPDATE notas_credito SET saldo_restante_usd = ? WHERE id_nota = ?",[D,I.id_nota],z=>z?U(z):A()))}}}}}let l="UPDATE ventas SET total_pagado = total_pagado + ? WHERE id_venta = ?";await new Promise((E,R)=>i.query(l,[m,a],v=>v?R(v):E())),await new Promise((E,R)=>i.commit(v=>v?R(v):E())),e.status(201).json({message:"Abono registrado con \xE9xito."})}catch(n){i.rollback(),e.status(400).json({message:n.message||"Error al procesar el abono."})}finally{i.release()}})},po=async(o,e)=>{let{id_venta:a}=o.params,{aplicar:s}=o.body;g.getConnection(async(t,r)=>{if(t)return e.status(500).json({message:"Error de conexi\xF3n."});try{let n=(await new Promise((m,l)=>r.query("SELECT monto_mora FROM configuracion WHERE id_config = 1",(E,R)=>E?l(E):m(R))))[0]?.monto_mora||3,d=s?`IF(DATEDIFF(NOW(), fecha) > 15, ${n}, 0.00)`:"0.00",_=`UPDATE ventas SET aplica_mora = ${s?1:0}, recargo_mora = ${d} WHERE id_venta = ?`;await new Promise((m,l)=>r.query(_,[a],E=>E?l(E):m())),e.status(200).json({message:"Estado de mora actualizado."})}catch{e.status(500).json({message:"Error al actualizar la mora."})}finally{r.release()}})};var B=ha.Router();B.get("/resumen",p,N("VER_CUENTAS_POR_COBRAR"),co);B.get("/cliente/:id_cliente",p,N("VER_CUENTAS_DEUDOR"),uo);B.post("/abono",p,N("REGISTRAR_ABONO"),lo);B.put("/mora/:id_venta",p,N("ALTERNAR_MORA"),po);var _o=B;import Aa from"express";import Eo from"bcrypt";import G from"fs";import X from"path";import{exec as Pa}from"child_process";import mo from"os";var b=(o,e)=>new Promise((a,s)=>{g.query(o,e,(t,r)=>{t?s(t):a(r)})}),go=(o,e)=>!o||o.trim().length<3?"El nombre debe tener al menos 3 caracteres.":!e||e.trim().length<3?"El apellido debe tener al menos 3 caracteres.":null,vo=(o,e)=>{let{backup_activo:a}=o.body;g.query("UPDATE configuracion SET backup_activo = ? WHERE id_config = 1",[a],(t,r)=>{if(t)return e.status(500).json({message:"Error al actualizar estado del respaldo."});e.status(200).json({message:"Estado del respaldo autom\xE1tico actualizado."})})},fo=async(o,e)=>{let a=`
        SELECT u.id_usu, u.usuario, u.estatus, u.ultimo_login, r.nom_rol, u.rol_usu, u.emp_usu, e.nom_emp, e.ape_emp, u.id_sucursal
        FROM usuarios u
        LEFT JOIN roles r ON u.rol_usu = r.id_rol
        LEFT JOIN empleados e ON u.emp_usu = e.id_emp
        ORDER BY u.id_usu DESC
    `;try{let s=await b(a,[]);e.status(200).json(s)}catch{e.status(500).json({message:"Error al obtener usuarios."})}},Ro=async(o,e)=>{let{usuario:a,contrasena:s,id_empleado:t,id_rol:r,id_sucursal:i}=o.body;if(!s||s.trim().length<4)return e.status(400).json({message:"La contrase\xF1a debe tener al menos 4 caracteres y no estar vac\xEDa."});try{if(parseInt(r)===1&&(await b("SELECT COUNT(*) as total FROM usuarios WHERE rol_usu = 1",[]))[0].total>0)return e.status(400).json({message:"Ya existe un Superadmin registrado."});let n=await Eo.hash(s,10),u=(await b("INSERT INTO usuarios (usuario, contra_hash, emp_usu, rol_usu, id_sucursal, estatus) VALUES (?, ?, ?, ?, ?, 'ACTIVO')",[a,n,t,r,i||1])).insertId,_=await b("SELECT id_permiso_ FROM permisos_rol WHERE id_rol_ = ?",[r]);if(_.length>0){let m=_.map(l=>[u,l.id_permiso_]);await b("INSERT INTO permisos_usuario (id_usu, id_permiso) VALUES ?",[m])}e.status(201).json({message:"Usuario creado y permisos asignados exitosamente."})}catch(n){if(n.code==="ER_DUP_ENTRY")return e.status(400).json({message:"El nombre de usuario o empleado ya est\xE1n en uso."});e.status(500).json({message:"Error al registrar usuario."})}},No=async(o,e)=>{let{id:a}=o.params,{usuario:s,id_rol:t,estatus:r,contrasena:i,id_sucursal:n}=o.body;if(i&&i.trim().length>0&&i.trim().length<4)return e.status(400).json({message:"La nueva contrase\xF1a es demasiado corta. M\xEDnimo 4 caracteres."});try{let d=await b("SELECT rol_usu FROM usuarios WHERE id_usu = ?",[a]);if(d.length>0&&d[0].rol_usu===1&&r==="INACTIVO")return e.status(403).json({message:"Seguridad del Sistema: El Superadmin principal no puede ser deshabilitado."});if(parseInt(t)===1&&(await b("SELECT COUNT(*) as total FROM usuarios WHERE rol_usu = 1 AND id_usu != ?",[a]))[0].total>0)return e.status(400).json({message:"Ya existe otro Superadmin."});let u,_;if(i&&i.trim()!==""){let m=await Eo.hash(i,10);u="UPDATE usuarios SET usuario=?, rol_usu=?, id_sucursal=?, estatus=?, contra_hash=? WHERE id_usu=?",_=[s,t,n||1,r,m,a]}else u="UPDATE usuarios SET usuario=?, rol_usu=?, id_sucursal=?, estatus=? WHERE id_usu=?",_=[s,t,n||1,r,a];await b(u,_),e.status(200).json({message:"Usuario actualizado."})}catch{e.status(500).json({message:"Error al actualizar usuario."})}},To=async(o,e)=>{try{let a=await b("SELECT rol_usu FROM usuarios WHERE id_usu = ?",[o.params.id]);if(a.length>0&&a[0].rol_usu===1)return e.status(403).json({message:"Prohibido eliminar al Superadmin."});await b("DELETE FROM usuarios WHERE id_usu = ?",[o.params.id]),e.status(200).json({message:"Usuario eliminado."})}catch{e.status(500).json({message:"Error al borrar usuario."})}},Oo=async(o,e)=>{try{let a=await b("SELECT * FROM sucursales ORDER BY id_sucursal DESC",[]);e.status(200).json(a)}catch{e.status(500).json({message:"Error al obtener sucursales."})}},bo=async(o,e)=>{let{nombre:a,direccion:s}=o.body;try{await b("INSERT INTO sucursales (nombre, direccion) VALUES (?, ?)",[a,s||null]),e.status(201).json({message:"Sucursal registrada exitosamente."})}catch{e.status(500).json({message:"Error al registrar sucursal."})}},So=async(o,e)=>{let{id:a}=o.params,{nombre:s,direccion:t}=o.body;try{await b("UPDATE sucursales SET nombre = ?, direccion = ? WHERE id_sucursal = ?",[s,t||null,a]),e.status(200).json({message:"Sucursal actualizada correctamente."})}catch{e.status(500).json({message:"Error al actualizar sucursal."})}},Io=async(o,e)=>{let{id:a}=o.params;if(parseInt(a)===1)return e.status(403).json({message:"Prohibido eliminar la sucursal matriz/principal."});try{await b("DELETE FROM sucursales WHERE id_sucursal = ?",[a]),e.status(200).json({message:"Sucursal eliminada."})}catch{e.status(400).json({message:"No se puede eliminar la sucursal porque tiene usuarios o inventario asociados."})}},Co=async(o,e)=>{try{let a=await b("SELECT * FROM empleados ORDER BY id_emp DESC",[]);e.status(200).json(a)}catch{e.status(500).json({message:"Error al obtener empleados."})}},yo=async(o,e)=>{let{nom_emp:a,ape_emp:s,ced_rif_emp:t,tipo_doc_emp:r,email_emp:i,num_tlf_emp:n,pref_tlf_emp:d}=o.body,u=go(a,s);if(u)return e.status(400).json({message:u});let _="INSERT INTO empleados (nom_emp, ape_emp, tipo_doc_emp, ced_rif_emp, email_emp, num_tlf_emp, pref_tlf_emp) VALUES (?, ?, ?, ?, ?, ?, ?)";try{await b(_,[a,s,r,t,i,n,d]),e.status(201).json({message:"Empleado registrado."})}catch(m){if(m.code==="ER_DUP_ENTRY")return e.status(400).json({message:"Ya existe un empleado registrado con esta C\xE9dula o Correo Electr\xF3nico."});e.status(500).json({message:"Error al registrar empleado."})}},Lo=async(o,e)=>{let{id:a}=o.params,{nom_emp:s,ape_emp:t,tipo_doc_emp:r,ced_rif_emp:i,email_emp:n,num_tlf_emp:d,pref_tlf_emp:u}=o.body,_=go(s,t);if(_)return e.status(400).json({message:_});let m="UPDATE empleados SET nom_emp=?, ape_emp=?, tipo_doc_emp=?, ced_rif_emp=?, email_emp=?, num_tlf_emp=?, pref_tlf_emp=? WHERE id_emp=?";try{await b(m,[s,t,r,i,n,d,u,a]),e.status(200).json({message:"Empleado actualizado."})}catch(l){if(l.code==="ER_DUP_ENTRY")return e.status(400).json({message:"La C\xE9dula o Correo ingresado ya le pertenece a otro empleado."});e.status(500).json({message:"Error al actualizar empleado."})}},ho=async(o,e)=>{try{await b("DELETE FROM empleados WHERE id_emp = ?",[o.params.id]),e.status(200).json({message:"Empleado eliminado."})}catch{e.status(400).json({message:"Tiene un usuario o datos vinculados."})}},Po=async(o,e)=>{let a="SELECT b.*, u.usuario FROM bitacora_auditoria b LEFT JOIN usuarios u ON b.id_usuario = u.id_usu ORDER BY b.fecha DESC LIMIT 150";try{let s=await b(a,[]);e.status(200).json(s)}catch{e.status(500).json({message:"Error de bit\xE1cora."})}},Do=async(o,e)=>{try{await b("DELETE FROM bitacora_auditoria",[]),e.status(200).json({message:"Historial limpiado exitosamente."})}catch{e.status(500).json({message:"Error al limpiar la bit\xE1cora."})}},Ao=async(o,e)=>{try{let a=await b("SELECT * FROM roles",[]);e.status(200).json(a)}catch{e.status(500).json({message:"Error de roles."})}},wo=async(o,e)=>{try{let a=await b("SELECT * FROM permisos",[]),s=await b("SELECT id_usu, id_permiso FROM permisos_usuario",[]);e.status(200).json({todosPermisos:a,mapeo:s})}catch(a){console.error("Error cargando permisos de usuario:",a),e.status(200).json({todosPermisos:[],mapeo:[]})}},jo=async(o,e)=>{let{id_usu:a,permisos:s}=o.body;try{if(await b("DELETE FROM permisos_usuario WHERE id_usu = ?",[a]),s&&s.length>0){let t=s.map(r=>[a,r]);await b("INSERT INTO permisos_usuario (id_usu, id_permiso) VALUES ?",[t])}e.status(200).json({message:"Permisos actualizados correctamente."})}catch{e.status(500).json({message:"Error al actualizar permisos de usuario."})}},Uo=(o,e)=>{let{DB_HOST:a,DB_USER:s,DB_PASSWORD:t,DB_NAME:r}=process.env,i=new Date().toISOString().replace(/T/,"_").replace(/:/g,"-").split(".")[0],n=`backup_${r}_${i}.sql`,d=X.join(mo.tmpdir(),"backups_lili_pos");G.existsSync(d)||G.mkdirSync(d,{recursive:!0});let u=X.join(d,n),l=`${mo.platform()==="win32"?`"${X.join(process.cwd(),"tools","mysqldump.exe")}"`:"mysqldump"} -h ${a} -P 4000 -u ${s}`;t&&(l+=` -p"${t}"`),l+=` --ssl ${r} > "${u}"`,Pa(l,(E,R,v)=>{if(E)return console.error("Error al generar el respaldo:",E),E.message.includes("Access denied")?e.status(500).json({message:"Acceso denegado a la base de datos."}):e.status(500).json({message:`Error ejecutando mysqldump: ${v||E.message}`});e.download(u,n,f=>{f&&console.error("Error enviando el archivo:",f),G.existsSync(u)&&G.unlinkSync(u)})})},Fo=(o,e)=>{g.query("SELECT id_metodo, descripcion, moneda FROM metodos_pago ORDER BY id_metodo DESC",(s,t)=>{if(s)return e.status(500).json({message:"Error al consultar m\xE9todos de pago."});e.status(200).json(t)})},qo=(o,e)=>{let{descripcion:a,moneda:s}=o.body;g.query("INSERT INTO metodos_pago (descripcion, moneda) VALUES (?, ?)",[a,s],(r,i)=>{if(r)return e.status(500).json({message:"Error al crear el m\xE9todo de pago."});e.status(201).json({message:"M\xE9todo registrado exitosamente.",id_metodo:i.insertId})})},xo=(o,e)=>{let{id:a}=o.params,{descripcion:s,moneda:t}=o.body;if(Number(a)===120009)return e.status(403).json({message:'Protecci\xF3n de Sistema: El m\xE9todo "Nota de Cr\xE9dito" no puede ser modificado.'});g.query("UPDATE metodos_pago SET descripcion = ?, moneda = ? WHERE id_metodo = ?",[s,t,a],(i,n)=>{if(i)return e.status(500).json({message:"Error al actualizar el m\xE9todo de pago."});e.status(200).json({message:"M\xE9todo actualizado exitosamente."})})},Mo=(o,e)=>{let{id:a}=o.params;if(Number(a)===120009)return e.status(403).json({message:'Protecci\xF3n de Sistema: El m\xE9todo "Nota de Cr\xE9dito" no puede ser eliminado.'});g.query("DELETE FROM metodos_pago WHERE id_metodo = ?",[a],(t,r)=>{if(t)return t.code==="ER_ROW_IS_REFERENCED_2"?e.status(400).json({message:"No se puede eliminar porque ya hay ventas registradas con este m\xE9todo."}):e.status(500).json({message:"Error al eliminar el m\xE9todo."});e.status(200).json({message:"M\xE9todo eliminado correctamente."})})};var S=Aa.Router();S.get("/bitacora",p,Po);S.delete("/bitacora",p,Do);S.get("/usuarios",p,fo);S.post("/usuarios",p,Ro);S.put("/usuarios/:id",p,No);S.delete("/usuarios/:id",p,To);S.get("/empleados",p,Co);S.post("/empleados",p,yo);S.put("/empleados/:id",p,Lo);S.delete("/empleados/:id",p,ho);S.get("/permisos",p,wo);S.post("/permisos/usuario/asignar",p,jo);S.get("/roles",p,Ao);S.get("/respaldo/descargar",p,Uo);S.get("/sucursales",p,Oo);S.post("/sucursales",p,bo);S.put("/sucursales/:id",p,So);S.delete("/sucursales/:id",p,Io);S.get("/metodos-pago",p,Fo);S.post("/metodos-pago",p,qo);S.put("/metodos-pago/:id",p,xo);S.delete("/metodos-pago/:id",p,Mo);S.put("/backup",p,N("VER_ADMINISTRACION"),vo);var Wo=S;import wa from"express";var P=(o,e)=>new Promise((a,s)=>{g.query(o,e,(t,r)=>{t?s(t):a(r)})}),ko=async(o,e)=>{let{fecha_inicio:a,fecha_fin:s,id_sucursal:t}=o.query;if(!a||!s)return e.status(400).json({message:"Fechas requeridas"});let r=t&&t!=="0"&&t!=="undefined"?String(t):"0";o.user&&o.user.rol_usu!==1&&(r=String(o.user.id_sucursal));let i="",n="",d="",u=[a,s],_=[a,s],m=[];r!=="0"&&(i=" AND v.id_sucursal = ?",n=" AND e.id_sucursal = ?",d=" AND inv.id_sucursal = ?",u.push(r),_.push(r),m.push(r));try{let l=`
            SELECT 
                SUM(
                    IFNULL((SELECT SUM(subtotal - (IFNULL(cantidad_devuelta, 0) * precio_unitario)) FROM detalles_venta dv WHERE dv.id_venta = v.id_venta), 0) 
                    - v.descuento_usd 
                    + v.recargo_mora
                ) as ventasTotales,
                SUM(v.descuento_usd) as totalDescuentos,
                (SELECT SUM((dv.cantidad_vendida - IFNULL(dv.cantidad_devuelta, 0)) * pp.costo_usd) 
                 FROM detalles_venta dv 
                 JOIN ventas v2 ON dv.id_venta = v2.id_venta 
                 JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
                 WHERE v2.id_cliente != 1 AND DATE(v2.fecha) BETWEEN ? AND ? ${i.replace("v.id_sucursal","v2.id_sucursal")}) as costoTotal
            FROM ventas v
            WHERE v.id_cliente != 1 AND DATE(v.fecha) BETWEEN ? AND ? ${i}
        `,E=`
            SELECT SUM(
                (IFNULL((SELECT SUM(subtotal) FROM detalles_venta dv WHERE dv.id_venta = v.id_venta), 0) - v.descuento_usd + v.recargo_mora)
                - 
                IFNULL((SELECT SUM(monto_usd) FROM pagos_venta pv WHERE pv.id_venta = v.id_venta), 0)
            ) as porCobrar
            FROM ventas v
            WHERE v.id_cliente != 1 AND DATE(v.fecha) BETWEEN ? AND ? ${i}
        `,R=`
            SELECT DATE(v.fecha) as fecha, 
                   SUM(IFNULL((SELECT SUM(subtotal - (IFNULL(cantidad_devuelta, 0) * precio_unitario)) FROM detalles_venta dv WHERE dv.id_venta = v.id_venta), 0) - v.descuento_usd + v.recargo_mora) as ventas,
                   SUM((SELECT SUM((dv2.cantidad_vendida - IFNULL(dv2.cantidad_devuelta, 0)) * pp.costo_usd) FROM detalles_venta dv2 JOIN presentaciones_producto pp ON dv2.id_presentacion = pp.id_presentacion WHERE dv2.id_venta = v.id_venta)) as costo
            FROM ventas v
            WHERE v.id_cliente != 1 AND DATE(v.fecha) BETWEEN ? AND ? ${i}
            GROUP BY DATE(v.fecha)
            ORDER BY DATE(v.fecha) ASC
        `,v=`
            SELECT p.nombre_base as name, SUM(dv.cantidad_vendida - IFNULL(dv.cantidad_devuelta, 0)) as value
            FROM detalles_venta dv
            JOIN ventas v ON dv.id_venta = v.id_venta
            JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            WHERE v.id_cliente != 1 AND DATE(v.fecha) BETWEEN ? AND ? ${i}
            GROUP BY p.id_prod, p.nombre_base
            HAVING value > 0
            ORDER BY value DESC
            LIMIT 5
        `,f=`
            SELECT p.nombre_base as producto, c.descrip_categ as categoria, inv.stock as stock_actual, pp.punto_reorden
            FROM inventario_sucursales inv
            JOIN presentaciones_producto pp ON inv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            WHERE inv.stock <= pp.punto_reorden ${d}
            ORDER BY inv.stock ASC
        `,c=`
            SELECT mp.descripcion as metodo, SUM(pv.monto_usd) as total_usd
            FROM pagos_venta pv
            JOIN ventas v ON pv.id_venta = v.id_venta
            JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
            WHERE v.id_cliente != 1 AND DATE(v.fecha) BETWEEN ? AND ? ${i}
            GROUP BY mp.id_metodo, mp.descripcion
            ORDER BY total_usd DESC
        `,T=`
            SELECT v.fecha, p.nombre_base as producto, (dv.cantidad_vendida - IFNULL(dv.cantidad_devuelta, 0)) as cantidad, 
                   IFNULL(v.motivo_ajuste, 'VENTA') as motivo_real, v.id_venta, v.id_cliente, u.usuario, 
                   CONCAT(e.nom_emp, ' ', e.ape_emp) as empleado
            FROM detalles_venta dv
            JOIN ventas v ON dv.id_venta = v.id_venta
            JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            JOIN usuarios u ON v.id_usuario = u.id_usu
            LEFT JOIN empleados e ON u.emp_usu = e.id_emp
            WHERE DATE(v.fecha) BETWEEN ? AND ? ${i}
            ORDER BY v.fecha DESC
        `,O=`
            SELECT e.fecha, p.nombre_base as producto, de.cantidad_recibida as cantidad,
                    IFNULL(prov.nombre, 'SIN PROVEEDOR') as proveedor
            FROM entradas_inventario e
            JOIN detalles_entrada de ON e.id_entrada = de.id_entrada
            JOIN productos p ON de.id_producto = p.id_prod
            LEFT JOIN proveedores prov ON e.id_prov = prov.id_prov
            WHERE DATE(e.fecha) BETWEEN ? AND ? ${n}
            ORDER BY e.fecha DESC
        `,C=`
            SELECT pv.id_pago, v.fecha, v.id_venta, mp.descripcion as metodo, pv.monto_usd, pv.es_vuelto
            FROM pagos_venta pv
            JOIN ventas v ON pv.id_venta = v.id_venta
            JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
            WHERE v.id_cliente != 1 AND DATE(v.fecha) BETWEEN ? AND ? ${i}
            ORDER BY v.fecha DESC
        `,I=`
            SELECT p.nombre_base as producto, c.descrip_categ as categoria, pp.precio_venta_usd
            FROM presentaciones_producto pp
            JOIN productos p ON pp.id_producto = p.id_prod
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion
            WHERE inv.stock > 0 ${d}
            GROUP BY pp.id_presentacion, p.nombre_base, c.descrip_categ, pp.precio_venta_usd
            ORDER BY c.descrip_categ, p.nombre_base ASC
        `,L=`
            SELECT 
                 IFNULL(prov.nombre, 'SIN PROVEEDOR') AS proveedor,
                COUNT(DISTINCT e.id_entrada) as total_compras,
                SUM(de.cantidad_recibida) AS total_articulos_comprados,
                SUM(de.subtotal_usd) AS inversion_total_usd
            FROM entradas_inventario e
            JOIN detalles_entrada de ON e.id_entrada = de.id_entrada
            LEFT JOIN proveedores prov ON e.id_prov = prov.id_prov
            WHERE DATE(e.fecha) BETWEEN ? AND ? ${n}
            GROUP BY prov.id_prov, prov.nombre
            ORDER BY inversion_total_usd DESC
        `,D=`
            SELECT 
                p.nombre_base as producto,
                pp.talla,
                pp.color,
                pp.codigo_barras,
                c.descrip_categ as categoria,
                pp.costo_usd as costo_unitario,
                SUM(inv.stock) as stock_actual,
                SUM(inv.stock * pp.costo_usd) as inversion_total,
                IFNULL((
                    SELECT prov.nombre 
                     FROM detalles_entrada de 
                     JOIN entradas_inventario e ON de.id_entrada = e.id_entrada
                    JOIN proveedores prov ON e.id_prov = prov.id_prov
                    WHERE de.id_presentacion = pp.id_presentacion
                    ORDER BY e.fecha DESC 
                    LIMIT 1
                ), 'SIN PROVEEDOR') as proveedor_principal
            FROM inventario_sucursales inv
            JOIN presentaciones_producto pp ON inv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            WHERE 1=1 ${d}
            GROUP BY pp.id_presentacion, p.nombre_base, pp.talla, pp.color, pp.codigo_barras, c.descrip_categ, pp.costo_usd
            ORDER BY stock_actual DESC
        `,A=[a,s];r!=="0"&&A.push(r),A.push(a,s),r!=="0"&&A.push(r);let[U,z,Ko,Zo,Qo,Xo,ea,oa,aa,sa,ta,ra]=await Promise.all([P(l,A),P(E,u),P(R,u),P(v,u),P(f,m),P(c,u),P(T,u),P(O,_),P(C,u),P(I,m),P(L,_),P(D,m)]),$=U[0]||{ventasTotales:0,costoTotal:0},na=z[0]||{porCobrar:0},ia=($.ventasTotales||0)-($.costoTotal||0);e.status(200).json({resumenGlobal:{ventasTotales:$.ventasTotales||0,costoTotal:$.costoTotal||0,utilidad:ia,porCobrar:na.porCobrar||0},datosVentas:Ko,datosTopProductos:Zo,datosReorden:Qo,datosMetodos:Xo,historialMovimientos:ea,historialEntradas:oa,historialIngresos:aa,listaPrecios:sa,datosProveedores:ta,datosStock:ra})}catch(l){console.error("Error al generar reportes:",l),e.status(500).json({message:"Error interno al generar resumen."})}};var Ho=wa.Router();Ho.get("/resumen",p,N("VER_REPORTES"),ko);var Bo=Ho;import{exec as ja}from"child_process";import ee from"path";import V from"fs";import Ua from"os";import Fa from"node-cron";import{google as zo}from"googleapis";var qa=process.env.GOOGLE_CLIENT_ID,xa=process.env.GOOGLE_CLIENT_SECRET,Ma=process.env.GOOGLE_REFRESH_TOKEN,Vo=process.env.GOOGLE_DRIVE_FOLDER_ID,$o=new zo.auth.OAuth2(qa,xa,"https://developers.google.com/oauthplayground");$o.setCredentials({refresh_token:Ma});var oe=zo.drive({version:"v3",auth:$o}),Wa=()=>{console.log("Iniciando respaldo autom\xE1tico...");let{DB_HOST:o,DB_USER:e,DB_PASSWORD:a,DB_NAME:s}=process.env,t=new Date().toISOString().replace(/T/,"_").replace(/:/g,"-").split(".")[0],r=`backup_auto_${s}_${t}.sql`,i=ee.join(Ua.tmpdir(),"backups_lili_pos");V.existsSync(i)||V.mkdirSync(i,{recursive:!0});let n=ee.join(i,r),u=`${`"${ee.join(process.cwd(),"tools","mysqldump.exe")}"`} -h ${o} -P 4000 -u ${e}`;a&&(u+=` -p"${a}"`),u+=` --ssl ${s} > "${n}"`,ja(u,async _=>{if(_){console.error("\u274C Error al generar mysqldump para Drive:",_);return}console.log("Respaldo temporal generado. Subiendo a Google Drive...");try{let m=await oe.files.list({q:`'${Vo}' in parents and trashed = false`,fields:"files(id, name)"});for(let l of m.data.files)await oe.files.delete({fileId:l.id});await oe.files.create({resource:{name:r,parents:[Vo]},media:{mimeType:"application/sql",body:V.createReadStream(n)},fields:"id"}),console.log("\u2705 \xA1\xC9xito! Nuevo respaldo subido a Drive")}catch(m){console.error("\u274C Error al procesar en Google Drive:",m.message)}finally{V.existsSync(n)&&V.unlinkSync(n)}})},Jo=()=>{Fa.schedule("0 9,21 * * *",()=>{g.query("SELECT backup_activo FROM configuracion WHERE id_config = 1",(o,e)=>{if(o)return console.error("Error consultando el estado del backup:",o);e.length>0&&e[0].backup_activo===1?Wa():console.log("\u23F0 Respaldo omitido: El sistema est\xE1 DESACTIVADO.")})},{scheduled:!0,timezone:"America/Caracas"}),console.log("\u2705 Servicio de respaldos autom\xE1ticos iniciado.")};var za=typeof process.pkg<"u",Yo=za?K.dirname(process.execPath):process.cwd();ka.config({path:K.join(Yo,".env")});var y=se(),ae=process.env.PORT||3001;y.use(Ha({origin:function(o,e){e(null,!0)},methods:["GET","POST","PUT","DELETE","OPTIONS"],allowedHeaders:["Content-Type","Authorization"],credentials:!0}));y.use(se.json());y.use("/api/auth",ce);y.use("/api/productos",ve);y.use("/api/clientes",Se);y.use("/api/nacionalidades",ye);y.use("/api/categorias",Ae);y.use("/api/unidades",Ue);y.use("/api/prefijos",xe);y.use("/api/proveedores",Ve);y.use("/api/configuracion",Qe);y.use("/api/ventas",to);y.use("/api/entradas",io);y.use("/api/cobros",_o);y.use("/api/admin",Wo);y.use("/api/reportes",Bo);Ba.schedule("0,15,30,45 9-10,16-17 * * *",async()=>{console.log("[CRON] Iniciando actualizaci\xF3n autom\xE1tica de tasas multimoneda...");try{let o=await Q();console.log("[CRON] \u2705 Tasas actualizadas con \xE9xito")}catch(o){console.error("[CRON] \u274C Error:",o.message)}});Jo();var Go=K.join(Yo,"public");y.use(se.static(Go));y.get(/.*/,(o,e)=>{e.sendFile(K.join(Go,"index.html"))});y.listen(ae,async()=>{console.log(`Servidor corriendo en el puerto ${ae}`);let o=`http://localhost:${ae}`;try{await Va(o),console.log(`Navegador abierto en: ${o}`)}catch(e){console.error("No se pudo abrir el navegador autom\xE1ticamente.",e)}});
