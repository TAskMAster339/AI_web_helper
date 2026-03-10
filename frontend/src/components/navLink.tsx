import { Link, useLocation } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  children: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));

  return (
    <Link to={to} className={`btn-nav${isActive ? ' active' : ''}`}>
      {children}
    </Link>
  );
};

export default NavLink;
