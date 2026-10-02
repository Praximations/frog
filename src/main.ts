import './style.css';

/** Phones (…#join) get a tiny DOM app; the projector loads the Phaser game. */
if (location.hash.startsWith('#join')) void import('./phone/PhoneApp').then(({ PhoneApp }) => new PhoneApp().start());
else void import('./game').then(({ startGame }) => startGame());
