import { FaUser } from "react-icons/fa6";
function Navbar() {
  return (
    <nav className="flex justify-between bg-orange-600 p-4 text-white">
    <h1>Omegle</h1>
    <span className="flex justify-center items-center gap-2"><FaUser />854,935 users online</span>
  </nav>
  )
}

export default Navbar