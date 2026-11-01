// Une photo qui peut avoir sa version téléphone (champ « …_mobile » du JSON) :
// l'écran plus haut que large (téléphone tenu droit) prend la version
// téléphone, les autres la version ordinateur. Sans version téléphone, la même
// photo partout. TALL est aussi la règle du cadrage (cropFor).
export const TALL = '(max-aspect-ratio: 1/1)';

export const isTall = () => typeof matchMedia !== 'undefined' && matchMedia(TALL).matches;

// La bonne photo pour l'écran du moment (WebGL : hero, tombée de la nuit)
export const pick = (desktop, mobile) => (mobile && isTall() ? mobile : desktop);

export default function Pic({ src, mobile, className, alt = '', style, loading, decoding = 'async', fetchpriority, ...rest }) {
  const img = <img className={className} src={src} alt={alt} style={style} loading={loading} decoding={decoding} fetchpriority={fetchpriority} {...rest} />;
  if (!mobile || mobile === src) return img;
  return (
    <picture style={{ display: 'contents' }}>
      <source media={TALL} srcSet={mobile} />
      {img}
    </picture>
  );
}
