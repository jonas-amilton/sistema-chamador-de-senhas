// let horas = Date()

// document.getElementById('horas').innerHTML = horas

function time()
{
    today=new Date();
    h=today.getHours();
    m=today.getMinutes();
    s=today.getSeconds();
    document.getElementById('horas').innerHTML=h+":"+m+":"+s;
    setTimeout('time()',500);
}