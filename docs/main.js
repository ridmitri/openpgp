$(() => {
  $('button[name="generate"]').click(() => {
    generate();
  });

  $('button[name="encrypt"]').click(() => {
    encrypt();
  });
  $('button[name="decrypt"]').click(() => {
    decrypt();
  });
});

function lock() {
  $(".lock").addClass("visible");
}

function unlock() {
  $(".lock").removeClass("visible");
}

function generate() {
  (async () => {
    lock();
    const passphrase = $("#passphrase").val();
    const ids = $("#user_ids").val() || "Adam <adam@cloud.com>";

    const userIDs = ids.split(",").map((item) => {
      const name = item.replace(/(.*)\s<.*/g, "$1").trim();
      const email = item.replace(/(.*)\s<(.*)>/g, "$2").trim();
      return {
        name,
        email,
      };
    });

    console.log(userIDs);

    const { privateKey, publicKey, revocationCertificate } =
      await openpgp.generateKey({
        type: "ecc", // Type of the key, defaults to ECC
        curve: "curve25519", // ECC curve name, defaults to curve25519

        userIDs, // you can pass multiple user IDs
        passphrase, // protects the private key
        format: "armored", // output key format, defaults to 'armored' (other options: 'binary' or 'object')
      });

    console.log(privateKey); // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
    console.log(publicKey); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
    console.log(revocationCertificate); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
    $("#privgenkey").val(privateKey);
    $("#pubgenkey").val(publicKey);

    // paste
    $("#enc-pubkey").val(publicKey);
    $("#enc-privkey").val(privateKey);
    $("#dec-privkey").val(privateKey);

    const rqOptions = {
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    };

    // test view
    new QRCode("qrcode", {
      ...rqOptions,
      text: privateKey,
    });

    //print view
    new QRCode("qr_priv_1", {
      text: privateKey,
      ...rqOptions,
    });
    new QRCode("qr_priv_2", {
      text: privateKey,
      ...rqOptions,
    });
    new QRCode("qr_pub_1", {
      text: publicKey,
      ...rqOptions,
    });
    new QRCode("qr_pub_2", {
      text: publicKey,
      ...rqOptions,
    });

    unlock();
  })();
  return false;
}

function encrypt() {
  (async () => {
    const publicKeyArmored = $("#enc-pubkey").val();
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

    const passphrase = $("#passphrase").val();
    const privateKeyArmored = $("#enc-privkey").val();

    let privateKey = null;
    if (passphrase) {
      privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({
          armoredKey: privateKeyArmored,
        }),
        passphrase,
      });
    } else {
      privateKey = await openpgp.readPrivateKey({
        armoredKey: privateKeyArmored,
      });
    }

    const text = $("#message").val();

    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text }), // input as Message object
      encryptionKeys: publicKey,
      signingKeys: privateKey, // optional
    });
    console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
    $("#message").val(encrypted);
  })();
  return false;
}

function decrypt() {
  (async () => {
    const passphrase = $("#passphrase").val();
    const privateKeyArmored = $("#dec-privkey").val();

    let privateKey = null;
    if (passphrase) {
      privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({
          armoredKey: privateKeyArmored,
        }),
        passphrase,
      });
    } else {
      privateKey = await openpgp.readPrivateKey({
        armoredKey: privateKeyArmored,
      });
    }

    const encryptedMessage = $("#dec-message").val();

    const message = await openpgp.readMessage({
      armoredMessage: encryptedMessage, // parse armored message
    });
    const publicKeyArmored = $("#enc-pubkey").val();
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

    const { data: decrypted, signatures } = await openpgp.decrypt({
      message,
      verificationKeys: publicKey, // optional
      decryptionKeys: privateKey,
    });
    console.log(decrypted); // 'Hello, World!'
    // check signature validity (signed messages only)
    $("#dec-message").val(decrypted);
    try {
      await signatures[0].verified; // throws on invalid signature
      console.log("Signature is valid");
      $("#signature-check").text("Signature is valid").removeClass("error");
    } catch (e) {
      $("#signature-check")
        .addClass("error")
        .text("Signature could not be verified!");
      throw new Error("Signature could not be verified: " + e.message);
    }
  })();
}
