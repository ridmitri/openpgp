$(() => {
  $('button[name="generate"]').click(() => {
    generate();
  });

  $('button[name="encrypt"]').click(function () {
    encrypt();
  });
  $('button[name="decrypt"]').click(function () {
    decrypt();
  });
});

function generate() {
  (async () => {
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
    $("#dec-privkey").val(privateKey);
    $("#pubgenkey").val(publicKey);
    $("#pubkey").val(publicKey);

    new QRCode("qrcode", {
      text: privateKey,
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  })();
  return false;
}

function encrypt() {
  (async () => {
    const publicKeyArmored = $("#pubkey").val();
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

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

    const text = $("#message").val();

    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text }), // input as Message object
      encryptionKeys: publicKey,
      signingKeys: privateKey, // optional
    });
    console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
    $("#message").val(encrypted);
    $("#dec-message").val(encrypted);
  })();
  return false;
}

function decrypt() {
  (async () => {
    const passphrase = $("#passphrase").val();
    const privateKeyArmored = $("#dec-privkey").val();
    const privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({
        armoredKey: privateKeyArmored,
      }),
      passphrase,
    });
    const encryptedMessage = $("#dec-message").val();

    const message = await openpgp.readMessage({
      armoredMessage: encryptedMessage, // parse armored message
    });
    const publicKeyArmored = $("#pubkey").val();
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

    const { data: decrypted, signatures } = await openpgp.decrypt({
      message,
      verificationKeys: publicKey, // optional
      decryptionKeys: privateKey,
    });
    console.log(decrypted); // 'Hello, World!'
    // check signature validity (signed messages only)
    $("#decrypted-message").text(decrypted);
    try {
      await signatures[0].verified; // throws on invalid signature
      console.log("Signature is valid");
    } catch (e) {
      throw new Error("Signature could not be verified: " + e.message);
    }
  })();
}
