import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAssistantOptional } from '../../context/AssistantContext';

export default function UserIntelligence() {
  const assistant = useAssistantOptional();

  useEffect(() => {
    assistant?.setOpen(true);
  }, [assistant]);

  return <Navigate to="/user/dashboard" replace />;
}
