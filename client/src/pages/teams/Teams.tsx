import { Navigate } from 'react-router-dom';

const Teams = () => {
  return <Navigate to="/users?tab=teams" replace />;
};

export default Teams;
