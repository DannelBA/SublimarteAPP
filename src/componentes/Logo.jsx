export default function Logo({ variante = 'horizontal', alto = 40 }) {
  const archivo = variante === 'vertical' ? '/logo-vertical.png' : '/logo-horizontal.png'
  return <img className="logo-img" src={archivo} alt="SublimArte" style={{ height: alto }} />
}