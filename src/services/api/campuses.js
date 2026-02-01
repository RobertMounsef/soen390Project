import { CAMPUSES } from '../../data/campuses';

export const getCampuses = () => CAMPUSES;

export const getCampusById = (id) =>
  CAMPUSES.find((campus) => campus.id === id);
