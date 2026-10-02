import './style.css';

/**
 * Everyone lands on the home page (join with a code, on a phone or a laptop): a small page with no
 * game engine. "Host a game" opens #host, which loads the Phaser game for the projector.
 */
if (location.hash.startsWith('#host')) void import('./game').then(({ startGame }) => startGame());
else void import('./phone/PhoneApp').then(({ PhoneApp }) => new PhoneApp().start());
