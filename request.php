<?php
header('Content-type: text/xml');
?>
<Response>
    <Dial callerId="+91 8958279395"><?php  echo $_POST['To'];?></Dial>
</Response>