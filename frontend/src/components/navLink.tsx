import { Link } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  children: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children }) => {
  return (
    <Link
      to={to}
      className="text-lg font-medium px-3 py-2 rounded-md text-text-light dark:text-text-dark opacity-80 hover:opacity-100 hover:bg-blue-500 hover:bg-opacity-10 dark:hover:bg-opacity-20 transition-all duration-200"
    >
      {children}
    </Link>
  );
};

export default NavLink;
